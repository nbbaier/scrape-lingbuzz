import { readFile, unlink, writeFile } from "node:fs/promises";
import {
  BATCH_SIZE,
  CHUNK_SIZE,
  ID_CACHE_PATH,
  PAPER_ID_LENGTH,
  PAPER_ID_START,
} from "./constants";
import { newestId, newIds } from "./new-ids";
import { parsePaper } from "./parsing";
import type { Paper } from "./schemas";
import { logger } from "./utils/logger";
import {
  getPaperHtml,
  loadPapers,
  mapWithConcurrency,
  updatePapers,
  writePapersFile,
} from "./utils/utils";

// Scraping statistics
interface ScrapeStats {
  startTime: number;
  papersAttempted: number;
  papersSucceeded: number;
  papersFailed: number;
  papersSkipped: number;
}

const stats: ScrapeStats = {
  startTime: Date.now(),
  papersAttempted: 0,
  papersSucceeded: 0,
  papersFailed: 0,
  papersSkipped: 0,
};

/**
 * Scrapes papers from the lingbuzz website based on the provided IDs.
 * Scraped papers are merged with existing data and persisted to papers.json.
 *
 * @param ids - An array of numbers representing the IDs of the papers to scrape. Defaults to an empty array.
 * @param existingPapers - The existing papers already stored in papers.json.
 * @returns A Promise that resolves when scraping and saving is complete.
 */
async function scrapePapers(ids: number[] = [], existingPapers: Paper[] = []) {
  const scrapedPapers: Paper[] = [];

  await mapWithConcurrency(ids, CHUNK_SIZE, async (id) => {
    stats.papersAttempted++;
    try {
      const paperId = id.toString().padStart(PAPER_ID_LENGTH, "0");
      const html = await getPaperHtml(paperId);

      const paper = parsePaper(html, paperId);

      if (paper) {
        scrapedPapers.push(paper);
        stats.papersSucceeded++;
      } else {
        stats.papersSkipped++;
      }
    } catch (e) {
      stats.papersFailed++;
      logger.error(`Failed to scrape paper with id ${id}`, e);
    }
  });

  const updatedPapersData = updatePapers(scrapedPapers, existingPapers);
  await writePapersFile(updatedPapersData);
}

/**
 * Prints scraping statistics summary.
 */
function printStats() {
  const durationMs = Date.now() - stats.startTime;
  const durationSec = (durationMs / 1000).toFixed(2);

  logger.info("=== Scraping Statistics ===");
  logger.info(`Duration: ${durationSec}s`);
  logger.info(`Papers attempted: ${stats.papersAttempted}`);
  logger.info(`Papers succeeded: ${stats.papersSucceeded}`);
  logger.info(`Papers failed: ${stats.papersFailed}`);
  logger.info(`Papers skipped: ${stats.papersSkipped}`);

  if (stats.papersAttempted > 0) {
    const successRate = (
      (stats.papersSucceeded / stats.papersAttempted) *
      100
    ).toFixed(1);
    logger.info(`Success rate: ${successRate}%`);
  }
}

async function loadIdCache(): Promise<number[]> {
  try {
    const raw = await readFile(ID_CACHE_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value) => Number.isInteger(value)) as number[];
  } catch {
    return [];
  }
}

async function saveIdCache(ids: number[]) {
  await writeFile(ID_CACHE_PATH, JSON.stringify(ids), "utf8");
}

async function removeIdCache() {
  try {
    await unlink(ID_CACHE_PATH);
  } catch {
    // file may not exist
  }
}

const currentPapers = await loadPapers();

if (currentPapers.length === 0) {
  let cachedIds = await loadIdCache();

  if (cachedIds.length === 0) {
    const newestPaper = await newestId();
    cachedIds = Array.from(
      { length: newestPaper - 1 },
      (_, i) => i + PAPER_ID_START
    );
    await saveIdCache(cachedIds);
    logger.info(`Cached ${cachedIds.length} paper IDs for batched scraping`);
  }

  const batch = cachedIds.slice(0, BATCH_SIZE);
  const remaining = cachedIds.slice(BATCH_SIZE);

  logger.info(
    `Scraping batch of ${batch.length} papers (${remaining.length} remaining)`
  );
  await scrapePapers(batch, currentPapers);

  if (remaining.length > 0) {
    await saveIdCache(remaining);
    logger.info(`${remaining.length} papers remaining in cache for next run`);
  } else {
    await removeIdCache();
    logger.info("Initial scraping backlog complete, cache cleared");
  }

  printStats();
} else {
  const newIdsList = await newIds(currentPapers);

  if (newIdsList.length > 0) {
    logger.info(`Scraping ${newIdsList.length} new papers`);
    await scrapePapers(newIdsList, currentPapers);
    logger.info("Scraping complete");
    printStats();
  } else {
    logger.info("No new papers to scrape");
  }
}
