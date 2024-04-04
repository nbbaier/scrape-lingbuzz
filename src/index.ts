import { JSDOM } from "jsdom";
import { getHtml } from "./getHtml";
import { loadPapers } from "./loadPapers";
import { newIds, newestId } from "./newIds";
import {
  parseAbstract,
  parseCenterElement,
  parseTable,
} from "./parsingHelpers";
import { splitKeywords } from "./splitKeywords";
import type { Paper } from "./types";
import { updatePapers } from "./updatePapers";

/**
 * Splits an array into chunks of a specified size.
 *
 * @template T - The type of elements in the array.
 * @param {T[]} array - The array to be chunked.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {T[][]} - An array of chunks, where each chunk is an array of elements.
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const results = [];
  while (array.length) {
    results.push(array.splice(0, chunkSize));
  }
  return results;
}

const papers: Paper[] = [];
const newIdsList = await newIds();

/**
 * Scrapes papers from the lingbuzz website based on the provided IDs.
 *
 * @param ids - An array of numbers representing the IDs of the papers to scrape. Defaults to an empty array.
 * @returns A Promise that resolves to an array of Paper objects containing the scraped data.
 * @throws If there is an error while scraping a paper.
 *
 * @example
 * // Scrape papers with IDs [1, 2, 3]
 * await scrapePapers([1, 2, 3]);
 */
async function scrapePapers(ids: number[] = []) {
  const chunkedIds = chunkArray(ids, 5);

  for (const chunk of chunkedIds) {
    await Promise.all(
      chunk.map(async (id) => {
        try {
          const paperId = id.toString().padStart(6, "0");
          const html = await getHtml(paperId);
          const document = new JSDOM(html).window.document;

          const pageTitle = document.querySelector("title")?.textContent;

          if (pageTitle === "lingbuzz - archive of linguistics articles") {
            console.log(`No paper found for ${paperId}`);
            return;
          }

          const header = parseCenterElement(document);
          const rowTexts = parseTable(document);

          const title = header[0].replace(/"/g, "'").trim();
          const authors = header[1].split(",").map((author) => author.trim());
          const date = header[2] ? header[2].trim() : "";
          const published_in = rowTexts.get("Published in") || "";
          const keywords_raw = rowTexts.get("keywords") || "";
          const keywords = splitKeywords(keywords_raw);
          const downloads = rowTexts.get("Downloaded")
            ? parseInt(rowTexts.get("Downloaded")?.split(" ")[0] as string)
            : 0;

          const rawAbstract = document.querySelector("body")?.childNodes[5]
            .textContent as string;

          const abstract = !/^Format:/.test(rawAbstract)
            ? parseAbstract(rawAbstract)
            : "";

          papers.push({
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
          });
        } catch (e) {
          console.log(`Failed to scrape paper with id ${id}:`, e);
        }
      })
    );
  }

  let currentPapers = await loadPapers();
  const updatedPapersData = await updatePapers(papers, currentPapers);

  Bun.write(
    "./papers.json",
    JSON.stringify(
      updatedPapersData.filter((item) => Object.keys(item).length !== 0)
    )
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

const currentPapers = await loadPapers();

if (currentPapers.length === 0) {
  const newestPaper = await newestId();
  const ids = Array.from({ length: newestPaper - 1 }, (_, i) => i + 2);
  console.log("Scraping all papers");
  await scrapePapers(ids);
  console.log("Scraping complete");
} else if (newIdsList.length > 0) {
  console.log("Scraping new papers");
  await scrapePapers(newIdsList);
  console.log("Scraping complete");
} else {
  console.log("No new papers to scrape");
}
