import { JSDOM } from "jsdom";
import type { Paper } from "./types";
import { getHtml } from "./getHtml";
import { splitKeywords } from "./splitKeywords";
import {
  parseCenterElement,
  parseTable,
  parseAbstract,
} from "./parseCenterElement";
import { newIds } from "./newIds";

const papers: Paper[] = [];

const newIdsList = await newIds();

async function scrapePapers(ids: number[] = []) {
  try {
    for (const id of ids) {
      const paperId = id.toString().padStart(6, "0");
      const html = await getHtml(paperId);
      const document = new JSDOM(html).window.document;

      const pageTitle = document.querySelector("title")?.textContent;

      if (pageTitle === "lingbuzz - archive of linguistics articles") {
        console.log(`No paper found for ${paperId}`);
        continue;
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
    }
  } catch (e) {
    console.log(e);
  }

  Bun.write(
    "./papers.json",
    JSON.stringify(papers)
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}

if (newIdsList.length > 0) {
  await scrapePapers(newIdsList);
  console.log("Scraping complete");
} else {
  console.log("No new papers to scrape");
}
