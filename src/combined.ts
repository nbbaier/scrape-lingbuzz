import { JSDOM } from "jsdom";
import type { Article, Author, Paper } from "./types";
import fs from "node:fs";

export const BASE_URL = "https://ling.auf.net/";
export const PAPERS_FILE_PATH = "./papers.json";
const papers: Paper[] = [];

/**
 * Splits an array into chunks of a specified size.
 *
 * @template T - The type of elements in the array...
 * @param {T[]} array - The array to be chunked.
 * @param {number} chunkSize - The size of each chunk.
 * @returns {T[][]} - An array of chunks, where each chunk is an array of elements.
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
	const results = [];
	while (array.length) {
		results.push(array.splice(0, chunkSize));
	}
	return results;
}

/**
 * Asynchronous function that retrieves HTML content for a specified paper ID.
 *
 * @param id - The ID of the paper to retrieve HTML content for.
 * @returns A Promise that resolves to the retrieved HTML content.
 */
export async function getPaperHtml(id: string): Promise<string> {
	const res = await fetch(`https://ling.auf.net/lingbuzz/${id}`);
	console.log(`Getting paper ${id}`);
	return res.text();
}

export async function getPaperCount(url = BASE_URL): Promise<number> {
	const res = await fetch(url);
	const html = await res.text();
	const document = new JSDOM(html).window.document;

	const paperCountElement = document.body.querySelector("center > b > a");

	if (!paperCountElement) {
		console.error("Paper count element not found");
		process.exit(1);
	}

	const textContent = paperCountElement.textContent || "";
	const numbers: number[] = textContent.match(/\d+/g)?.map(Number) || [];
	const paperCount = numbers.at(-1);

	if (!paperCount) {
		console.error("Paper count not found");
		process.exit(1);
	}

	return paperCount;
}

export async function generateUrls(
	baseURL: string,
	customLimit?: number,
): Promise<string[]> {
	const limit = customLimit || (await getPaperCount(baseURL));

	const urls: string[] = [];
	let start = 1;

	while (start <= limit) {
		urls.push(`${baseURL}/lingbuzz/_listing?start=${start}`);

		if (start === 1) {
			start = 31;
		} else {
			start += 100;
		}
	}

	return urls;
}

export async function getPageRows(url: string): Promise<HTMLTableRowElement[]> {
	const res = await fetch(url);
	const html = await res.text();
	const document = new JSDOM(html).window.document;

	const mainTable = document.body
		.querySelectorAll("table")[2]
		.querySelector("td > table");

	if (!mainTable) {
		console.error("Main table not found");
		process.exit(1);
	}

	const rows = mainTable.querySelectorAll("tr");

	if (rows.length === 0) {
		console.error("No rows found in the main table");
		process.exit(1);
	}

	return Array.from(rows);
}

export const extractArticlesFromRow = (row: HTMLTableRowElement): Article | null => {
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
			username: decodeURI(a.href).match(/\/_person\/(.*)/)?.[1] || "",
		};

		authors.push(author);
		authorsMap.set(index + 1, author);
	}

	const pdfLink = pdfCell.querySelector("a")?.href
		? `${BASE_URL}${pdfCell.querySelector("a")?.href.split("?")[0]}`
		: null;
	const title = titleCell.querySelector("a")?.textContent?.trim() || "";
	const titleLink = titleCell.querySelector("a")?.href || "";
	const idMatch = titleLink.match(/\/lingbuzz\/(\d{6})/);
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
 * @param papersFilePath - The path to the papers JSON file. Defaults to "./papers.json".
 * @returns A promise that resolves to an array of Paper objects.
 * @throws If there is an error loading the papers data.
 */
export async function loadPapers(papersFilePath = PAPERS_FILE_PATH): Promise<Paper[]> {
	try {
		if (!fs.existsSync(PAPERS_FILE_PATH)) {
			console.log("Creating papers.json");
			await Bun.write(PAPERS_FILE_PATH, JSON.stringify([]));
		}
		const papersFile = Bun.file(PAPERS_FILE_PATH);
		return JSON.parse(await papersFile.text());
	} catch (error) {
		console.error("Failed to load papers:", error);
		throw new Error("Error loading papers data");
	}
}

/**
 * Updates the list of papers with new papers.
 *
 * @param {Paper[]} papers - The new papers to be added.
 * @param {Paper[]} newPapers - The current list of papers.
 * @returns {Promise<Paper[]>} The updated list of papers.
 */
export async function updatePapers(
	papers: Paper[],
	newPapers: Paper[],
): Promise<Paper[]> {
	for (const item of papers) {
		const exists = newPapers.some((obj) => obj.id === item.id);
		if (!exists) {
			newPapers.push(item);
		}
	}
	return newPapers;
}

/**
 * Retrieves the front page IDs from the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to an array of numbers representing the front page IDs.
 */
async function getFrontPageIds(): Promise<number[]> {
	const res = await fetch("https://ling.auf.net/");
	const html = await res.text();
	const document = new JSDOM(html).window.document;

	const mainTable = document.body
		.querySelectorAll("table")[2]
		.querySelector("td > table");

	const regex = /\/lingbuzz\/(\d{6})/;

	const hrefs = Array.from(mainTable?.querySelectorAll("a") || [])
		.map((a) => a.href)
		.filter((href) => regex.test(href)) // filter hrefs that match the regex
		.map((href) => {
			const match = regex.exec(href);
			return match ? match[1] : ""; // return the first capturing group (the 6-digit number)
		})
		.map((id) => Number.parseInt(id))
		.filter((v, i, a) => a.indexOf(v) === i); // remove duplicates

	return hrefs;
}

/**
 * Retrieves the newest ID from the front page of the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to the newest ID as a number.
 */
export async function newestId(): Promise<number> {
	const res = await fetch("https://ling.auf.net/");
	const html = await res.text();

	const hrefs = await getFrontPageIds();

	return hrefs.sort((a, b) => b - a)[0];
}

/**
 * Retrieves the new IDs from the front page and compares them with the IDs of the current papers.
 *
 * @returns A promise that resolves to an array of new IDs.
 */
export async function newIds(): Promise<number[]> {
	const hrefs = await getFrontPageIds();

	let currentPapers: Paper[] = [];

	try {
		currentPapers = await loadPapers();
		if (currentPapers.length === 0) {
			console.log("No papers found in papers.json");
			return [];
		}
	} catch (e) {
		console.error("Failed to load papers:", e);
	}

	const currentIds = currentPapers
		.map((paper) => paper.id)
		.map((id) => Number.parseInt(id));

	const newIds = hrefs.filter((id) => !currentIds.includes(id));

	return newIds;
}

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
	return rawAbstract.replace(/"/g, "'").replace(/\n/g, " ").replace(/\s+/g, " ");
}

/**
 * Splits a string of keywords into an array of individual keywords.
 *
 * The function first splits the input string by commas, but ignores commas that are inside brackets, parentheses, or curly braces.
 * Then it further splits each resulting string by various separators such as " ·", "-", "–", "", or "/ ".
 * Finally, it trims any leading or trailing whitespace from each keyword.
 *
 * @param {string} inputString - The string of keywords to be split.
 * @returns {string[]} An array of individual keywords.
 */
export function splitKeywords(inputString: string): string[] {
	const splitRegex = /,(?![^{\[\(<]*[\]\)}>])/;
	const resplitRegex = / ·|-|–||\/ /;
	return inputString
		.split(splitRegex)
		.flatMap((s) => s.split(resplitRegex))
		.map((s) => s.trim());
}

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
					const html = await getPaperHtml(paperId);
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
						? Number.parseInt(rowTexts.get("Downloaded")?.split(" ")[0] as string)
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
			}),
		);
	}

	const currentPapers = await loadPapers();
	const updatedPapersData = await updatePapers(papers, currentPapers);

	Bun.write(
		"./papers.json",
		JSON.stringify(updatedPapersData.filter((item) => Object.keys(item).length !== 0))
			// biome-ignore lint/suspicious/noControlCharactersInRegex: <explanation>
			.replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
			.replace(/\s+/g, " ")
			.trim(),
	);
}
