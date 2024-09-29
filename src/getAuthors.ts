import { JSDOM } from "jsdom";

const res = await fetch("https://ling.auf.net/");
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

interface Article {
	id: string;
	authors: { name: string; position: number; authorUrl: string }[];
	pdfLink: string | null;
	title: string;
}

const regex = /\/lingbuzz\/(\d{6})/;

const articles: Article[] = Array.from(rows)
	.map((row) => {
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
			}),
		);
		const pdfLink = pdfCell.querySelector("a")?.href || null;
		const title = titleCell.querySelector("a")?.textContent?.trim() || "";
		const titleLink = titleCell.querySelector("a")?.href || "";
		const idMatch = titleLink.match(regex);
		const id = idMatch ? idMatch[1] : "000000";

		return {
			id,
			authors,
			pdfLink,
			title,
		};
	})
	.filter((article): article is Article => article !== null);

console.log(articles[1]);
