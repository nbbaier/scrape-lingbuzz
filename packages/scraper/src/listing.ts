import { JSDOM } from "jsdom";
import { BASE_URL, LISTING_PAGE_SIZE } from "./constants";
import type { ListingAuthor, ListingRow, PaperStatus } from "./types";
import { logger } from "./utils/logger";
import { fetchWithRetry } from "./utils/retry";

const LINGBUZZ_ID_REGEX = /\/lingbuzz\/(\d{6})/;
const PERSON_USERNAME_REGEX = /\/_person\/(.*)/;

/**
 * Gets the total paper count from the lingbuzz front page.
 */
async function getPaperCount(): Promise<number> {
  const res = await fetchWithRetry(BASE_URL);
  const html = await res.text();
  const document = new JSDOM(html).window.document;

  const paperCountElement = document.body.querySelector("center > b > a");
  if (!paperCountElement) {
    throw new Error("Paper count element not found");
  }

  const textContent = paperCountElement.textContent || "";
  const numbers = textContent.match(/\d+/g)?.map(Number) || [];
  const paperCount = numbers.at(-1);

  if (!paperCount) {
    throw new Error("Paper count not found");
  }

  return paperCount;
}

/**
 * Generates paginated listing page URLs for lingbuzz.
 */
export async function generateListingUrls(
  customLimit?: number
): Promise<string[]> {
  const limit = customLimit ?? (await getPaperCount());

  const urls: string[] = [];
  let start = 1;

  while (start <= limit) {
    urls.push(`${BASE_URL}/lingbuzz/_listing?start=${start}`);

    if (start === 1) {
      start = 31;
    } else {
      start += LISTING_PAGE_SIZE;
    }
  }

  return urls;
}

/**
 * Parses a single table row from a listing page into a ListingRow.
 */
export function parseListingRow(row: HTMLTableRowElement): ListingRow | null {
  const cells = row.querySelectorAll("td");
  if (cells.length < 4) {
    return null;
  }

  const [authorCell, statusCell, fileCell, titleCell] = cells;

  const status: PaperStatus = statusCell.textContent?.trim() || "";
  const authorsMap = new Map<number, ListingAuthor>();

  for (const [index, a] of Array.from(
    authorCell.querySelectorAll("a")
  ).entries()) {
    const nameContent = a.textContent?.trim().split(", ") || ["", ""];
    const author: ListingAuthor = {
      firstName: nameContent[1] || "",
      lastName: nameContent[0] || "",
      authorUrl: a.href || "",
      username: decodeURI(a.href).match(PERSON_USERNAME_REGEX)?.[1] || "",
    };
    authorsMap.set(index + 1, author);
  }

  const downloadUrl = fileCell.querySelector("a")?.href
    ? `${BASE_URL}${fileCell.querySelector("a")?.href.split("?")[0]}`
    : "";

  const title = titleCell.querySelector("a")?.textContent?.trim() || "";
  const titleLink = titleCell.querySelector("a")?.href || "";
  const idMatch = titleLink.match(LINGBUZZ_ID_REGEX);
  const paperId = idMatch ? idMatch[1] : "000000";
  const paperUrl = `${BASE_URL}/lingbuzz/${paperId}`;

  return {
    paperId,
    title,
    status,
    authors: authorsMap,
    downloadUrl,
    paperUrl,
  };
}

/**
 * Fetches a listing page and parses all rows into ListingRow objects.
 */
export async function fetchListingPage(url: string): Promise<ListingRow[]> {
  logger.info(`Fetching listing page: ${url}`);
  const res = await fetchWithRetry(url);
  const html = await res.text();
  const document = new JSDOM(html).window.document;

  const tables = document.body.querySelectorAll("table");
  const mainTable =
    tables.length > 2 ? tables[2].querySelector("td > table") : null;

  if (!mainTable) {
    logger.warn(`Main table not found on listing page: ${url}`);
    return [];
  }

  const rows = mainTable.querySelectorAll("tr");
  const results: ListingRow[] = [];

  for (const row of rows) {
    const parsed = parseListingRow(row as HTMLTableRowElement);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
