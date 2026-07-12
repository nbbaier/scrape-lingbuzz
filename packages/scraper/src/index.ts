import { createDb, type Db } from "@lingbuzz/db";
import { finishSyncRun, insertSyncRunStart } from "@lingbuzz/db/queries/sync";
import { CHUNK_SIZE } from "./constants";
import { classifyRows, type ScrapeAction } from "./detect";
import { fetchListingPage, generateListingUrls } from "./listing";
import { parsePaperPage } from "./paper-parser";
import { persistPaper } from "./persist";
import { mapWithConcurrency } from "./utils/concurrency";
import { logger } from "./utils/logger";
import { fetchWithRetry } from "./utils/retry";

interface ScrapeStats {
  failed: number;
  fullScrapes: number;
  pagesProcessed: number;
  // Total listing rows examined across all pages processed this run.
  papersSeen: number;
  skipped: number;
  startTime: number;
  versionUpdates: number;
}

const stats: ScrapeStats = {
  startTime: Date.now(),
  pagesProcessed: 0,
  papersSeen: 0,
  fullScrapes: 0,
  versionUpdates: 0,
  skipped: 0,
  failed: 0,
};

/**
 * Processes a single scrape action (full-scrape or update-version).
 */
async function processAction(db: Db, action: ScrapeAction): Promise<void> {
  if (action.action === "skip") {
    stats.skipped++;
    return;
  }

  const { row } = action;

  try {
    if (action.action === "full-scrape") {
      const res = await fetchWithRetry(row.paperUrl);
      const html = await res.text();
      const paper = parsePaperPage(html, row.paperId);

      if (!paper) {
        logger.warn(`Could not parse paper ${row.paperId}`);
        stats.failed++;
        return;
      }

      await persistPaper(db, paper, row.authors);
      stats.fullScrapes++;
      logger.info(`Scraped and persisted paper ${row.paperId}`);
    } else if (action.action === "update-version") {
      // TODO: fetch detail page and update version-specific fields
      stats.versionUpdates++;
      logger.info(`Version update for paper ${row.paperId} (stub)`);
    }
  } catch (error) {
    stats.failed++;
    logger.error(`Failed to process paper ${row.paperId}`, error);
  }
}

/**
 * Records the start of a Sync run. Recording failures are logged but never
 * crash the scrape, so a missing sync_runs table degrades gracefully.
 */
async function startSyncRun(
  db: Db,
  runner: string
): Promise<number | undefined> {
  try {
    return await insertSyncRunStart(db, { runner, startedAt: new Date() });
  } catch (error) {
    logger.error("Failed to record sync run start", error);
    return undefined;
  }
}

/**
 * Fills in the outcome of a Sync run, mapping the accumulated scrape stats.
 * A missing start id or a recording failure is logged and ignored.
 */
async function completeSyncRun(
  db: Db,
  syncRunId: number | undefined,
  success: boolean,
  errorMessage: string | undefined
): Promise<void> {
  if (syncRunId === undefined) {
    return;
  }

  try {
    await finishSyncRun(db, syncRunId, {
      finishedAt: new Date(),
      papersSeen: stats.papersSeen,
      papersNew: stats.fullScrapes,
      papersUpdated: stats.versionUpdates,
      papersFailed: stats.failed,
      success,
      errorMessage,
    });
  } catch (error) {
    logger.error("Failed to record sync run completion", error);
  }
}

function printStats(): void {
  const durationMs = Date.now() - stats.startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  logger.info("=== Scraping Statistics ===");
  logger.info(`Duration: ${durationSec}s`);
  logger.info(`Pages processed: ${stats.pagesProcessed}`);
  logger.info(`Full scrapes: ${stats.fullScrapes}`);
  logger.info(`Version updates: ${stats.versionUpdates}`);
  logger.info(`Skipped: ${stats.skipped}`);
  logger.info(`Failed: ${stats.failed}`);
}

/**
 * Main scraper entry point.
 *
 * In incremental mode (default): stops pagination when a page has zero actionable rows.
 * In full mode (--full flag): processes all listing pages.
 */
async function main(): Promise<void> {
  const fullMode = process.argv.includes("--full");

  logger.info(`Starting scraper in ${fullMode ? "full" : "incremental"} mode`);

  const url = process.env.TURSO_DATABASE_URL;
  if (!url) {
    throw new Error("TURSO_DATABASE_URL environment variable is required");
  }

  const db = createDb({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const runner = process.env.SYNC_RUNNER ?? "local";
  const syncRunId = await startSyncRun(db, runner);

  let success = false;
  let errorMessage: string | undefined;
  try {
    const urls = await generateListingUrls();
    logger.info(`Generated ${urls.length} listing page URLs`);

    for (const url of urls) {
      const rows = await fetchListingPage(url);
      const actions = await classifyRows(db, rows);

      const actionable = actions.filter((a) => a.action !== "skip");
      stats.pagesProcessed++;
      stats.papersSeen += rows.length;

      if (!fullMode && actionable.length === 0) {
        logger.info(
          `No actionable rows on page ${stats.pagesProcessed}, stopping incremental scrape`
        );
        break;
      }

      logger.info(
        `Page ${stats.pagesProcessed}: ${actionable.length} actionable / ${rows.length} total rows`
      );

      await mapWithConcurrency(actions, CHUNK_SIZE, (action) =>
        processAction(db, action)
      );
    }

    success = true;
    printStats();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    throw error;
  } finally {
    await completeSyncRun(db, syncRunId, success, errorMessage);
  }
}

await main();
