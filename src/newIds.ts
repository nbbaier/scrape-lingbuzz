import { JSDOM } from "jsdom";
import { BASE_URL } from "./constants";
import type { Paper } from "./types";
import { logger } from "./utils/logger";
import { fetchWithRetry } from "./utils/retry";
import { loadPapers } from "./utils/utils";

/**
 * Retrieves the front page IDs from the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to an array of numbers representing the front page IDs.
 */
async function getFrontPageIds(): Promise<number[]> {
	const res = await fetchWithRetry(BASE_URL);
	const html = await res.text();
	const document = new JSDOM(html).window.document;

	const tables = document.body.querySelectorAll("table");
	const mainTable = tables.length > 2 ? tables[2].querySelector("td > table") : null;

	if (!mainTable) {
		throw new Error("Failed to scrape front page: main table not found");
	}

	const regex = /\/lingbuzz\/(\d{6})/;

	const hrefs = Array.from(mainTable.querySelectorAll("a"))
		.map((a) => a.href)
		.filter((href) => regex.test(href)) // filter hrefs that match the regex
		.map((href) => {
			const match = regex.exec(href);
			return match ? match[1] : ""; // return the first capturing group (the 6-digit number)
		})
		.map((id) => Number.parseInt(id, 10))
		.filter((v, i, a) => a.indexOf(v) === i); // remove duplicates

	return hrefs;
}

/**
 * Retrieves the newest ID from the front page of the website "https://ling.auf.net/".
 *
 * @returns A promise that resolves to the newest ID as a number.
 */
export async function newestId(): Promise<number> {
	const hrefs = await getFrontPageIds();

	if (hrefs.length === 0) {
		throw new Error("No paper IDs found on front page");
	}

	return Math.max(...hrefs);
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
			logger.info("No papers found in papers.json");
			return [];
		}
	} catch (e) {
		logger.error("Failed to load papers:", e);
		return [];
	}

	const currentIds = new Set(currentPapers.map((paper) => Number.parseInt(paper.id, 10)));

	const newPaperIds = hrefs.filter((id) => !currentIds.has(id));

	if (newPaperIds.length > 0) {
		logger.info(`Found ${newPaperIds.length} new paper IDs on front page`);
	}

	return newPaperIds;
}
