import { JSDOM } from "jsdom";
import { loadPapers } from "./loadPapers";

export async function newIds(): Promise<number[]> {
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

  const currentIds = (await loadPapers())
    .map((paper) => paper.id)
    .map((id) => parseInt(id));

  const newIds = hrefs.filter((id) => !currentIds.includes(id));

  return newIds;
}

newIds();
