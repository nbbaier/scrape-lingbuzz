import {
  BATCH_SIZE,
  CHUNK_SIZE,
  PAPER_ID_LENGTH,
  PAPER_ID_START,
} from "./constants";
import { newestId } from "./new-ids";
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

let totalAttempted = 0;
let totalSucceeded = 0;
let totalFailed = 0;
let totalSkipped = 0;

async function scrapeBatch(
  ids: number[],
  existingPapers: Paper[]
): Promise<Paper[]> {
  const scrapedPapers: Paper[] = [];

  await mapWithConcurrency(ids, CHUNK_SIZE, async (id) => {
    totalAttempted++;
    try {
      const paperId = id.toString().padStart(PAPER_ID_LENGTH, "0");
      const html = await getPaperHtml(paperId);
      const paper = parsePaper(html, paperId);

      if (paper) {
        scrapedPapers.push(paper);
        totalSucceeded++;
      } else {
        totalSkipped++;
      }
    } catch (e) {
      totalFailed++;
      logger.error(`Failed to scrape paper with id ${id}`, e);
    }
  });

  return updatePapers(scrapedPapers, existingPapers);
}

const startTime = Date.now();

logger.info("=== Initial Full Scrape ===");

const newest = await newestId();
const allIds = Array.from({ length: newest - 1 }, (_, i) => i + PAPER_ID_START);

let existingPapers = await loadPapers();
const existingIds = new Set(
  existingPapers.map((p) => Number.parseInt(p.id, 10))
);
const idsToScrape = allIds.filter((id) => !existingIds.has(id));

logger.info(`Newest paper ID: ${newest}`);
logger.info(`Already have ${existingPapers.length} papers`);
logger.info(`Papers to scrape: ${idsToScrape.length}`);

let remaining = idsToScrape;
let batchNum = 0;

while (remaining.length > 0) {
  batchNum++;
  const batch = remaining.slice(0, BATCH_SIZE);
  remaining = remaining.slice(BATCH_SIZE);

  logger.info(
    `Batch ${batchNum}: scraping ${batch.length} papers (${remaining.length} remaining)`
  );

  existingPapers = await scrapeBatch(batch, existingPapers);
  await writePapersFile(existingPapers);

  logger.info(`Total papers saved: ${existingPapers.length}`);
}

const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

logger.info("=== Initial Scrape Complete ===");
logger.info(`Duration: ${durationSec}s`);
logger.info(`Papers attempted: ${totalAttempted}`);
logger.info(`Papers succeeded: ${totalSucceeded}`);
logger.info(`Papers failed: ${totalFailed}`);
logger.info(`Papers skipped: ${totalSkipped}`);

if (totalAttempted > 0) {
  const successRate = ((totalSucceeded / totalAttempted) * 100).toFixed(1);
  logger.info(`Success rate: ${successRate}%`);
}
