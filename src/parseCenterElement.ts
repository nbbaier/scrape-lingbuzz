import { JSDOM } from "jsdom";

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
