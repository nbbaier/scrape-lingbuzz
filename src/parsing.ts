import { JSDOM } from "jsdom";
import { parseAbstract, parseCenterElement, parseTable } from "./parsingHelpers";
import { splitKeywords } from "./splitKeywords";
import { PaperSchema, type Paper } from "./schemas";
import { logger } from "./utils/logger";

export function parsePaper(html: string, paperId: string): Paper | null {
	const document = new JSDOM(html).window.document;
	const pageTitle = document.querySelector("title")?.textContent;

	if (pageTitle === "lingbuzz - archive of linguistics articles") {
		logger.info(`No paper found for ${paperId}`);
		return null;
	}

	const header = parseCenterElement(document);
	const rowTexts = parseTable(document);

	// Safely access header elements with validation
	const titleRaw = header[0];
	const authorsRaw = header[1];
	const dateRaw = header[2];

	if (!titleRaw || !authorsRaw) {
		logger.warn(`Missing header data for paper ${paperId}`);
		return null;
	}

	const title = titleRaw.replace(/"/g, "'").trim();
	const authors = authorsRaw.split(",").map((author) => author.trim());
	const date = dateRaw ? dateRaw.trim() : "";
	const published_in = rowTexts.get("Published in") || "";
	const keywords_raw = rowTexts.get("keywords") || "";
	const keywords = splitKeywords(keywords_raw);
	const downloadStr = rowTexts.get("Downloaded");
	const downloads = (() => {
		if (!downloadStr) return 0;
		const match = downloadStr.match(/\d+/);
		return match ? Number.parseInt(match[0], 10) || 0 : 0;
	})();

	let rawAbstract = "";
	const body = document.querySelector("body");

	if (body) {
		// Legacy: Try exact index first, but only if it looks like the abstract (text node)
		// The original scraper strictly used childNodes[5].
		const legacyNode = body.childNodes[5];
		if (legacyNode?.nodeType === 3 && legacyNode.textContent?.trim()) {
			rawAbstract = legacyNode.textContent;
		} else {
			// Robust fallback: Look for the first substantial text node after the table
			const table = body.querySelector("table");
			if (table) {
				let curr: ChildNode | null = table.nextSibling;
				while (curr) {
					if (curr.nodeType === 3 && curr.textContent?.trim()) {
						rawAbstract = curr.textContent;
						break;
					}
					curr = curr.nextSibling;
				}
			}
		}
	}

	// Fallback to original behavior if smart search failed
	if (!rawAbstract && body?.childNodes[5]?.textContent) {
		rawAbstract = body.childNodes[5].textContent;
	}

	const abstract = !/^Format:/.test(rawAbstract)
		? parseAbstract(rawAbstract)
		: "";

	const paperData = {
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
	};

	try {
		return PaperSchema.parse(paperData);
	} catch (error) {
		logger.error(`Validation failed for paper ${paperId}`, error);
		return null;
	}
}
