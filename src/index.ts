import { JSDOM } from "jsdom";
import type { Paper } from "./types";

const args = Bun.argv.slice(2);
const input = parseInt(args[0]) || 2;
const papers: Paper[] = [];

export function splitKeywords(inputString: string): string[] {
  const splitRegex = /,(?![^{\[\(<]*[\]\)}>])/;
  const resplitRegex = / ·|-|–||\/ /;
  return inputString
    .split(splitRegex)
    .map((s) => s.split(resplitRegex))
    .flat()
    .map((s) => s.trim());
}

export async function fetchHtml(id: string): Promise<string> {
  console.log(`Getting ${id}`);
  const res = await fetch(`https://ling.auf.net/lingbuzz/${id}`);
  return res.text();
}

async function getHtml(id: string): Promise<string> {
  const html = await fetchHtml(id);
  return html;
}

export function parseCenterElement(document: Document): string[] {
  const centerElement = document.querySelector("body > center");
  if (!centerElement) return [];

  const linesWithHtml = centerElement.innerHTML.split(/<br\s*\/?>/gi);

  const lines = linesWithHtml
    .map((line) => {
      const tempDom = new JSDOM(`<div>${line}</div>`);
      return (
        tempDom.window.document.querySelector("div")?.textContent?.trim() || ""
      );
    })
    .filter(Boolean); // Filter out any empty strings

  return lines;
}

export function parseTable(document: Document): Map<string, string> {
  const table = document.querySelector("body > table");
  if (!table) {
    console.error("Table not found in the document.");
    return new Map();
  }

  const tableDataMap = new Map<string, string>();
  table.querySelectorAll("tr").forEach((row) => {
    const cells = Array.from(row.querySelectorAll("td"))
      .map((td) => td.textContent?.trim())
      .filter(Boolean); // This removes any falsy values, including empty strings

    if (cells.length >= 2) {
      const key = (cells[0] ?? "").replace(":", "");
      const value = cells[1] || "";
      tableDataMap.set(key, value);
    }
  });

  return tableDataMap;
}

export function parseAbstract(rawAbstract: string): string {
  return rawAbstract
    .replace(/"/g, "'")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ");
}

const id = input.toString().padStart(6, "0");
const html = await getHtml(id);
const document = new JSDOM(html).window.document;

const pageTitle = document.querySelector("title")?.textContent;

if (pageTitle === "lingbuzz - archive of linguistics articles") {
  throw new Error(`No paper found for ${id}`);
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
  id: id,
  title,
  authors,
  date,
  published_in,
  keywords_raw,
  keywords,
  abstract,
  downloads,
  link: `https://ling.auf.net/lingbuzz/${id}`,
});

console.log(papers);
