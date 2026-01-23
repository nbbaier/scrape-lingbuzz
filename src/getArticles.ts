import { BASE_URL } from "./constants";
import type { Article } from "./types";
import { extractArticlesFromRow, generateUrls, getPageRows } from "./utils/utils";

const pagesToScrape = await generateUrls(BASE_URL);
const allArticles: Article[] = [];

for (const page of pagesToScrape) {
	console.log(`Scraping ${page}`);
	const rows = await getPageRows(page);
	const articles: Article[] = Array.from(rows)
		.map((row) => extractArticlesFromRow(row))
		.filter((article): article is Article => article !== null);

	allArticles.push(...articles);
}

await Bun.write("articles.json", JSON.stringify(allArticles, null, 2));
