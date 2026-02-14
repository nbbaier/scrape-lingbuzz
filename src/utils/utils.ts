import fs from "node:fs";
import { file, write } from "bun";
import type { JSDOM } from "jsdom";
import {
  BASE_URL,
  PAGINATION_FIRST_START,
  PAGINATION_INCREMENT,
  PAGINATION_SECOND_START,
  PAPERS_FILE_PATH,
} from "../constants";
import type { Article, Author, Paper } from "../types";
import { logger } from "./logger";
import { fetchWithRetry } from "./retry";

const PERSON_USERNAME_REGEX = /\/_person\/(.*)/;
const LINGBUZZ_ID_REGEX = /\/lingbuzz\/(\d{6})/;

/**
 * Asynchronous function that retrieves HTML content for a specified paper ID.
 * Uses retry logic with exponential backoff for resilience.
 *
 * @param id - The ID of the paper to retrieve HTML content for.
 * @returns A Promise that resolves to the retrieved HTML content.
 */
export async function getPaperHtml(id: string): Promise<string> {
  logger.info(`Fetching paper ${id}`);
  const res = await fetchWithRetry(`https://ling.auf.net/lingbuzz/${id}`);
  return res.text();
}

export async function getPaperCount(BASE_URL: string): Promise<number> {
  const res = await fetch(BASE_URL);
  const html = await res.text();

  // Use regex to find the paper count element: <center><b><a ...>...</a></b></center>
  const match = html.match(/<center>\s*<b>\s*<a[^>]*>(.*?)<\/a>\s*<\/b>\s*<\/center>/is);

  if (!match) {
    logger.error("Paper count element not found");
    process.exit(1);
  }

  // Extract text and strip any internal HTML tags
  const textContent = match[1].replace(/<[^>]*>/g, "") || "";
  const numbers: number[] = textContent.match(/\d+/g)?.map(Number) || [];
  const paperCount = numbers.at(-1);

  if (!paperCount) {
    logger.error("Paper count not found");
    process.exit(1);
  }

  return paperCount;
}

export async function generateUrls(
  baseURL: string,
  customLimit?: number
): Promise<string[]> {
  const limit = customLimit || (await getPaperCount(baseURL));

  const urls: string[] = [];
  let start = PAGINATION_FIRST_START;

  while (start <= limit) {
    urls.push(`${baseURL}/lingbuzz/_listing?start=${start}`);

    if (start === PAGINATION_FIRST_START) {
      start = PAGINATION_SECOND_START;
    } else {
      start += PAGINATION_INCREMENT;
    }
  }

  return urls;
}

export async function getPageRows(url: string): Promise<any[]> {
  const { JSDOM: JSDOMClass } = await import("jsdom");
  const res = await fetchWithRetry(url);
  const html = await res.text();
  const document = new JSDOMClass(html).window.document;

  const mainTable = document.body
    .querySelectorAll("table")[2]
    .querySelector("td > table");

  if (!mainTable) {
    logger.error("Main table not found");
    process.exit(1);
  }

  const rows = mainTable.querySelectorAll("tr");

  if (rows.length === 0) {
    logger.error("No rows found in the main table");
    process.exit(1);
  }

  return Array.from(rows);
}

export const extractArticlesFromRow = (row: any): Article | null => {
  const cells = row.querySelectorAll("td");
  if (cells.length < 4) {
    return null;
  }

  const authorCell = cells[0];
  const pdfCell = cells[2];
  const titleCell = cells[3];
  const authorsArray = Array.from(authorCell.querySelectorAll("a")).entries();
  const authors: Author[] = [];
  const authorsMap = new Map<number, Author>();

  for (const [index, a] of authorsArray) {
    const author: Author = {
      firstName: a.textContent?.trim().split(" ")[0] || "",
      lastName: a.textContent?.trim().split(" ")[1] || "",
      authorUrl: a.href || "",
      username: decodeURI(a.href).match(PERSON_USERNAME_REGEX)?.[1] || "",
    };

    authors.push(author);
    authorsMap.set(index + 1, author);
  }

  const pdfLink = pdfCell.querySelector("a")?.href
    ? `${BASE_URL}${pdfCell.querySelector("a")?.href.split("?")[0]}`
    : null;
  const title = titleCell.querySelector("a")?.textContent?.trim() || "";
  const titleLink = titleCell.querySelector("a")?.href || "";
  const idMatch = titleLink.match(LINGBUZZ_ID_REGEX);
  const id = idMatch ? idMatch[1] : "000000";
  const paperURL = `https://ling.auf.net/lingbuzz/${id}`;

  return {
    id,
    authors: Object.fromEntries(authorsMap),
    pdfLink,
    paperURL,
    title,
  };
};

/**
 * Loads previously scraped papers data from a JSON file.
 *
 * @param papersFilePath - The path to the papers JSON file. Defaults to PAPERS_FILE_PATH.
 * @returns A promise that resolves to an array of Paper objects.
 * @throws If there is an error loading the papers data.
 */
export async function loadPapers(
  papersFilePath = PAPERS_FILE_PATH
): Promise<Paper[]> {
  try {
    if (!fs.existsSync(papersFilePath)) {
      logger.info(`Creating ${papersFilePath}`);
      await write(papersFilePath, JSON.stringify([]));
    }
    const papersFile = file(papersFilePath);
    return JSON.parse(await papersFile.text());
  } catch (error) {
    logger.error("Failed to load papers:", error);
    throw new Error("Error loading papers data");
  }
}

/**
 * Merges newly scraped papers with the existing list of papers.
 * Existing papers with the same ID are preserved.
 *
 * @param newPapers - The new papers to be added.
 * @param existingPapers - The current list of existing papers.
 * @returns The updated list of papers, sorted by ID.
 */
export function updatePapers(
  newPapers: Paper[],
  existingPapers: Paper[]
): Paper[] {
  const merged = new Map<string, Paper>();
  for (const paper of existingPapers) {
    merged.set(paper.id, paper);
  }
  for (const paper of newPapers) {
    if (!merged.has(paper.id)) {
      merged.set(paper.id, paper);
    }
  }
  return Array.from(merged.values()).sort(
    (a, b) => Number.parseInt(a.id, 10) - Number.parseInt(b.id, 10)
  );
}

/**
 * Splits an array into chunks of a specified size.
 * Does not mutate the original array.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} array - The array to be chunked.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {T[][]} - An array of chunks, where each chunk is an array of elements.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}

/**
 * Maps over an array with a specified concurrency limit.
 *
 * @template T - The type of elements in the input array.
 * @template R - The type of the result of the mapping function.
 * @param {T[]} items - The array to map over.
 * @param {number} concurrency - The maximum number of concurrent promises.
 * @param {(item: T) => Promise<R>} fn - The mapping function.
 * @returns {Promise<R[]>} - A promise that resolves to an array of results.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  const executing = new Set<Promise<void>>();
  const promises: Promise<void>[] = [];

  for (const [index, item] of items.entries()) {
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }

    const p = fn(item).then((result) => {
      results[index] = result;
    });

    const wrapper = p.finally(() => {
      executing.delete(wrapper);
    });

    executing.add(wrapper);
    promises.push(wrapper);
  }

  await Promise.all(promises);
  return results;
}
