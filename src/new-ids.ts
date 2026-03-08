import { JSDOM } from "jsdom";
import { BASE_URL } from "./constants";
import type { Paper } from "./types";
import { logger } from "./utils/logger";
import { fetchWithRetry } from "./utils/retry";
import { loadPapers } from "./utils/utils";

const LINGBUZZ_ID_REGEX = /\/lingbuzz\/(\d{6})/;

/**
 * Retrieves the front page IDs from the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to an array of numbers representing the front page IDs.
 */
async function getFrontPageIds(): Promise<number[]> {
  const res = await fetchWithRetry(BASE_URL);
  const html = await res.text();
  const document = new JSDOM(html).window.document;

  const tables = document.body.querySelectorAll("table");
  const mainTable =
    tables.length > 2 ? tables[2].querySelector("td > table") : null;

  if (!mainTable) {
    throw new Error("Failed to scrape front page: main table not found");
  }

  const ids = new Set<number>();
  for (const a of mainTable.querySelectorAll("a")) {
    const match = LINGBUZZ_ID_REGEX.exec(a.href);
    if (match) {
      ids.add(Number.parseInt(match[1], 10));
    }
  }

  return Array.from(ids);
}

/**
 * Retrieves the newest ID from the front page of the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to the newest ID as a number.
 */
export async function newestId(): Promise<number> {
  const hrefs = await getFrontPageIds();

  if (hrefs.length === 0) {
    throw new Error("No paper IDs found on front page");
  }

  return Math.max(...hrefs);
}

/**
 * Retrieves the new IDs from the front page and compares them with the IDs of the current papers.
 *
 * @param existingPapers - Optional preloaded papers to avoid re-reading papers.json.
 * @returns A promise that resolves to an array of new IDs.
 */
export async function newIds(existingPapers?: Paper[]): Promise<number[]> {
  const hrefs = await getFrontPageIds();

  let currentPapers = existingPapers ?? [];

  if (!existingPapers) {
    try {
      currentPapers = await loadPapers();
      if (currentPapers.length === 0) {
        logger.info("No papers found in papers.json");
        return [];
      }
    } catch (e) {
      logger.error("Failed to load papers:", e);
      return [];
    }
  } else if (currentPapers.length === 0) {
    logger.info("No papers found in papers.json");
    return [];
  }

  const currentIds = new Set(
    currentPapers.map((paper) => Number.parseInt(paper.id, 10))
  );

  const newPaperIds = hrefs.filter((id) => !currentIds.has(id));

  if (newPaperIds.length > 0) {
    logger.info(`Found ${newPaperIds.length} new paper IDs on front page`);
  }

  return newPaperIds;
}
