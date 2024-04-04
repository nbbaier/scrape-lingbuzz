import { JSDOM } from "jsdom";
import { loadPapers } from "./loadPapers";
import type { Paper } from "./types";

async function frontPageIds(): Promise<number[]> {
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

export async function newestId(): Promise<number> {
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
    .filter((v, i, a) => a.indexOf(v) === i) // remove duplicates
    .sort((a, b) => b - a);

  return hrefs[0];
}

export async function newIds(): Promise<number[]> {
  const res = await fetch("https://ling.auf.net/");
  const html = await res.text();
  const document = new JSDOM(html).window.document;

  const mainTable = document.body
    .querySelectorAll("table")[2]
    .querySelector("td > table");

  const regex = /\/lingbuzz\/(\d{6})/;

  const hrefs = await frontPageIds();

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
