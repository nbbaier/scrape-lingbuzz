import { JSDOM } from "jsdom";
import type { Article } from "./types";
import { BASE_URL } from "./constants";
import { generateUrls } from "./createURLS";

async function getPageRows(url: string): Promise<HTMLTableRowElement[]> {
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

const extractArticlesFromRow = (row: HTMLTableRowElement): Article | null => {
	const cells = row.querySelectorAll("td");
	if (cells.length < 4) {
		return null;
	}

	const authorCell = cells[0];
	const pdfCell = cells[2];
	const titleCell = cells[3];

	const authors = Array.from(authorCell.querySelectorAll("a")).map(
		(a, index) => ({
			name: a.textContent?.trim() || "",
			position: index + 1,
			authorUrl: a.href || "",
			username: a.href.match(/\/_person\/(.*)/)?.[1] || "",
		}),
	);
	const pdfLink = pdfCell.querySelector("a")?.href || null;
	const title = titleCell.querySelector("a")?.textContent?.trim() || "";
	const titleLink = titleCell.querySelector("a")?.href || "";
	const idMatch = titleLink.match(/\/lingbuzz\/(\d{6})/);
	const id = idMatch ? idMatch[1] : "000000";

	return {
		id,
		authors,
		pdfLink,
		title,
	};
};

const pagesToScrape = await generateUrls(BASE_URL, 100);

const allArticles: Article[] = [];

for (const page of pagesToScrape) {
	console.log(`Scraping ${page}`);
	const rows = await getPageRows(page);

	const articles: Article[] = Array.from(rows)
		.map((row) => extractArticlesFromRow(row))
		.filter((article): article is Article => article !== null);

	allArticles.push(...articles);
}

const rows = await getPageRows(BASE_URL);

const articles: Article[] = Array.from(rows)
	.map((row) => extractArticlesFromRow(row))
	.filter((article): article is Article => article !== null);

await Bun.write("articles.json", JSON.stringify(articles, null, 2));
