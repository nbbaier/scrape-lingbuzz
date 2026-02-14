/**
 * Parses the center element in a document and returns an array of strings.
 *
 * @param document - The document to parse.
 * @returns An array of strings representing the parsed center element.
 */
export function parseCenterElement(document: Document): string[] {
  const centerElement = document.querySelector("body > center");
  if (!centerElement) {
    return [];
  }

  const linesWithHtml = centerElement.innerHTML.split(/<br\s*\/?>/gi);

  const tempDiv = document.createElement("div");
  const lines = linesWithHtml
    .map((line) => {
      tempDiv.innerHTML = line;
      return tempDiv.textContent?.trim() || "";
    })
    .filter(Boolean);

  return lines;
}

/**
 * Parses a table in a document and returns a map of key-value pairs.
 *
 * @param document - The document to parse.
 * @returns A map of key-value pairs representing the parsed table.
 */
export function parseTable(document: Document): Map<string, string> {
  const table = document.querySelector("body > table");
  if (!table) {
    return new Map();
  }

  const tableDataMap = new Map<string, string>();
  for (const row of table.querySelectorAll("tr")) {
    const cells = Array.from(row.querySelectorAll("td"))
      .map((td) => td.textContent?.trim())
      .filter(Boolean);

    if (cells.length >= 2) {
      const key = (cells[0] ?? "").replace(":", "").trim();
      const value = cells[1] || "";
      const normalizedKey = key.toLowerCase().replace(/\s+/g, " ").trim();
      tableDataMap.set(normalizedKey, value);
    }
  }

  return tableDataMap;
}

/**
 * Parses the raw abstract string by replacing double quotes with single quotes,
 * newlines with spaces, and multiple spaces with a single space.
 *
 * @param rawAbstract - The raw abstract string to be parsed.
 * @returns The parsed abstract string.
 */
export function parseAbstract(rawAbstract: string): string {
  return rawAbstract
    .replace(/"/g, "'")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
