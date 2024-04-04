import { JSDOM } from "jsdom";
import { loadPapers } from "./loadPapers";
import type { Paper } from "./types";

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
    .map((id) => parseInt(id))
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
    .map((id) => parseInt(id));

  const newIds = hrefs.filter((id) => !currentIds.includes(id));

  return newIds;
}
