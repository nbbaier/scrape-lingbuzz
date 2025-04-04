import { JSDOM } from "jsdom";
import fs from "node:fs";
import type { Article, Author, Paper } from "../types";
import { BASE_URL, PAPERS_FILE_PATH } from "../constants";

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

export async function getPaperCount(BASE_URL: string): Promise<number> {
	const res = await fetch(BASE_URL);
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
