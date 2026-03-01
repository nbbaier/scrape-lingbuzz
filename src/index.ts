import { unlink } from "node:fs/promises";
import { write } from "bun";
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

const papers: Paper[] = [];
const newIdsList = await newIds();

/**
 * Scrapes papers from the lingbuzz website based on the provided IDs.
 * Scraped papers are added to the module-level `papers` array and then merged with existing data.
 *
 * @param ids - An array of numbers representing the IDs of the papers to scrape. Defaults to an empty array.
 * @returns A Promise that resolves when scraping and saving is complete.
 */
async function scrapePapers(ids: number[] = []) {
  await mapWithConcurrency(ids, CHUNK_SIZE, async (id) => {
    stats.papersAttempted++;
    try {
      const paperId = id.toString().padStart(PAPER_ID_LENGTH, "0");
      const html = await getPaperHtml(paperId);

      const paper = parsePaper(html, paperId);

      if (paper) {
        papers.push(paper);
        stats.papersSucceeded++;
      } else {
        stats.papersSkipped++;
      }
    } catch (e) {
      stats.papersFailed++;
      logger.error(`Failed to scrape paper with id ${id}`, e);
    }
  });

  const currentPapers = await loadPapers();
  const updatedPapersData = await updatePapers(papers, currentPapers);

  await write(
    "./papers.json",
    JSON.stringify(
      updatedPapersData.filter((item) => Object.keys(item).length !== 0)
    )
      // biome-ignore lint/suspicious/noControlCharactersInRegex: control characters sometimes appear in scraped HTML content; strip them to ensure the generated papers.json contains only valid JSON text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
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
    const cacheFile = Bun.file(ID_CACHE_PATH);
    return JSON.parse(await cacheFile.text());
  } catch {
    return [];
  }
}

async function saveIdCache(ids: number[]) {
  await write(ID_CACHE_PATH, JSON.stringify(ids));
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
  await scrapePapers(batch);

  if (remaining.length > 0) {
    await saveIdCache(remaining);
    logger.info(`${remaining.length} papers remaining in cache for next run`);
  } else {
    await removeIdCache();
    logger.info("Initial scraping backlog complete, cache cleared");
  }

  printStats();
} else if (newIdsList.length > 0) {
  logger.info(`Scraping ${newIdsList.length} new papers`);
  await scrapePapers(newIdsList);
  logger.info("Scraping complete");
  printStats();
} else {
  logger.info("No new papers to scrape");
}
