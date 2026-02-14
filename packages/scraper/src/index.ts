import { CHUNK_SIZE } from "./constants";
import { classifyRows, type ScrapeAction } from "./detect";
import { fetchListingPage, generateListingUrls } from "./listing";
import { parsePaperPage } from "./paper-parser";
import { persistPaper } from "./persist";
import { mapWithConcurrency } from "./utils/concurrency";
import { logger } from "./utils/logger";
import { fetchWithRetry } from "./utils/retry";

interface ScrapeStats {
  startTime: number;
  pagesProcessed: number;
  fullScrapes: number;
  versionUpdates: number;
  skipped: number;
  failed: number;
}

const stats: ScrapeStats = {
  startTime: Date.now(),
  pagesProcessed: 0,
  fullScrapes: 0,
  versionUpdates: 0,
  skipped: 0,
  failed: 0,
};

/**
 * Processes a single scrape action (full-scrape or update-version).
 */
async function processAction(action: ScrapeAction): Promise<void> {
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

      await persistPaper(paper, row.authors);
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

  const urls = await generateListingUrls();
  logger.info(`Generated ${urls.length} listing page URLs`);

  for (const url of urls) {
    const rows = await fetchListingPage(url);
    const actions = await classifyRows(rows);

    const actionable = actions.filter((a) => a.action !== "skip");
    stats.pagesProcessed++;

    if (!fullMode && actionable.length === 0) {
      logger.info(
        `No actionable rows on page ${stats.pagesProcessed}, stopping incremental scrape`
      );
      break;
    }

    logger.info(
      `Page ${stats.pagesProcessed}: ${actionable.length} actionable / ${rows.length} total rows`
    );

    await mapWithConcurrency(actions, CHUNK_SIZE, processAction);
  }

  printStats();
}

await main();
