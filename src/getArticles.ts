import { BASE_URL, CHUNK_SIZE } from "./constants";
import type { Article } from "./types";
import {
	chunkArray,
	extractArticlesFromRow,
	generateUrls,
	getPageRows,
} from "./utils/utils";

const pagesToScrape = await generateUrls(BASE_URL);
const allArticles: Article[] = [];

const chunks = chunkArray(pagesToScrape, CHUNK_SIZE);

for (const chunk of chunks) {
	const chunkPromises = chunk.map(async (page) => {
		console.log(`Scraping ${page}`);
		const rows = await getPageRows(page);
		return Array.from(rows)
			.map((row) => extractArticlesFromRow(row))
			.filter((article): article is Article => article !== null);
	});

	const results = await Promise.all(chunkPromises);
	results.forEach((articles) => allArticles.push(...articles));
}

await Bun.write("articles.json", JSON.stringify(allArticles, null, 2));
