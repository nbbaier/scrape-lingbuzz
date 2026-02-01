import { write } from "bun";
import { BASE_URL, CHUNK_SIZE } from "./constants";
import type { Article } from "./types";
import {
  extractArticlesFromRow,
  generateUrls,
  getPageRows,
  mapWithConcurrency,
} from "./utils/utils";

const pagesToScrape = await generateUrls(BASE_URL);

const results = await mapWithConcurrency(
  pagesToScrape,
  CHUNK_SIZE,
  async (page) => {
    console.log(`Scraping ${page}`);
    const rows = await getPageRows(page);
    return Array.from(rows)
      .map((row) => extractArticlesFromRow(row))
      .filter((article): article is Article => article !== null);
  }
);

const allArticles = results.flat();

await write("articles.json", JSON.stringify(allArticles, null, 2));
