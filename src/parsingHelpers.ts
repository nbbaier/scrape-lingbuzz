import { JSDOM } from "jsdom";

/**
 * Parses the center element in a document and returns an array of strings.
 *
 * @param document - The document to parse.
 * @returns An array of strings representing the parsed center element.
 */
export function parseCenterElement(document: Document): string[] {
	const centerElement = document.querySelector("body > center");
	if (!centerElement) return [];

	const linesWithHtml = centerElement.innerHTML.split(/<br\s*\/?>/gi);

	const lines = linesWithHtml
		.map((line) => {
			const tempDom = new JSDOM(`<div>${line}</div>`);
			return tempDom.window.document.querySelector("div")?.textContent?.trim() || "";
		})
		.filter(Boolean); // Filter out any empty strings

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
			.filter(Boolean); // This removes any falsy values, including empty strings

		if (cells.length >= 2) {
			const key = (cells[0] ?? "").replace(":", "");
			const value = cells[1] || "";
			tableDataMap.set(key, value);
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
