import { JSDOM } from "jsdom";
import {
  parseAbstract,
  parseCenterElement,
  parseTable,
} from "./parsing-helpers";
import { type Paper, PaperSchema } from "./schemas";
import { splitKeywords } from "./split-keywords";
import { logger } from "./utils/logger";

const QUOTE_REGEX = /"/g;
const WHITESPACE_REGEX = /\s+/g;
const DOWNLOAD_COUNT_REGEX = /\d+/;
const FORMAT_PREFIX_REGEX = /^Format:/;

const stripControlChars = (value: string): string =>
  Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code <= 31 || (code >= 127 && code <= 159));
    })
    .join("");

const normalizeText = (value: string): string =>
  stripControlChars(value)
    .replace(QUOTE_REGEX, "'")
    .replace(WHITESPACE_REGEX, " ")
    .trim();

const getTableValue = (table: Map<string, string>, keys: string[]): string => {
  for (const key of keys) {
    const value = table.get(key);
    if (value) {
      return value;
    }
  }
  return "";
};

const parseHeaderData = (
  header: string[],
  paperId: string
): { title: string; authors: string[]; date: string } | null => {
  const titleRaw = header[0];
  const authorsRaw = header[1];
  const dateRaw = header[2];

  if (!(titleRaw && authorsRaw)) {
    logger.warn(`Missing header data for paper ${paperId}`);
    return null;
  }

  const title = normalizeText(titleRaw);
  const authors = normalizeText(authorsRaw)
    .split(",")
    .map((author) => author.trim())
    .filter(Boolean);
  const date = dateRaw ? normalizeText(dateRaw) : "";

  return { title, authors, date };
};

const parseDownloads = (rowTexts: Map<string, string>): number => {
  const downloadStr = getTableValue(rowTexts, [
    "downloaded",
    "downloads",
    "downloaded times",
  ]);

  if (!downloadStr) {
    return 0;
  }

  const match = downloadStr.match(DOWNLOAD_COUNT_REGEX);
  return match ? Number.parseInt(match[0], 10) || 0 : 0;
};

const extractRawAbstract = (document: Document): string => {
  const body = document.querySelector("body");
  if (!body) {
    return "";
  }

  const legacyNode = body.childNodes[5];
  if (legacyNode?.nodeType === 3 && legacyNode.textContent?.trim()) {
    return legacyNode.textContent;
  }

  const table = body.querySelector("table");
  if (table) {
    let curr: ChildNode | null = table.nextSibling;
    while (curr) {
      if (curr.nodeType === 3 && curr.textContent?.trim()) {
        return curr.textContent;
      }
      curr = curr.nextSibling;
    }
  }

  return body.childNodes[5]?.textContent ?? "";
};

export function parsePaper(html: string, paperId: string): Paper | null {
  const document = new JSDOM(html).window.document;
  const pageTitle = document.querySelector("title")?.textContent;

  if (pageTitle === "lingbuzz - archive of linguistics articles") {
    logger.info(`No paper found for ${paperId}`);
    return null;
  }

  const header = parseCenterElement(document);
  const rowTexts = parseTable(document);

  const headerData = parseHeaderData(header, paperId);
  if (!headerData) {
    return null;
  }
  const { title, authors, date } = headerData;
  const published_in = normalizeText(
    getTableValue(rowTexts, ["published in", "publication", "published"])
  );
  const keywords_raw = normalizeText(
    getTableValue(rowTexts, ["keywords", "key words", "key-words"])
  );
  const keywords = splitKeywords(keywords_raw);
  const downloads = parseDownloads(rowTexts);
  const rawAbstract = extractRawAbstract(document);
  const abstract = FORMAT_PREFIX_REGEX.test(rawAbstract)
    ? ""
    : parseAbstract(rawAbstract);

  const paperData = {
    id: paperId,
    title,
    authors,
    date,
    published_in,
    keywords_raw,
    keywords,
    abstract,
    downloads,
    link: `https://ling.auf.net/lingbuzz/${paperId}`,
  };

  try {
    return PaperSchema.parse(paperData);
  } catch (error) {
    logger.error(`Validation failed for paper ${paperId}`, error);
    return null;
  }
}
