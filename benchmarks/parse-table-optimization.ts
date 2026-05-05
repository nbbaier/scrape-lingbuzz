import { JSDOM } from "jsdom";
import { bench, run } from "mitata";

const htmlString = `
<html>
<body>
  <table>
    <tr><td>Key 1:</td><td>Value 1</td></tr>
    <tr><td>Key 2: </td><td>Value 2 </td><td>Extra</td></tr>
    <tr><td> Key 3 </td><td></td></tr>
    <tr><td></td><td></td></tr>
    <tr><td>Key 4:</td><td>Value 4</td></tr>
    <tr><td>Key 5</td><td>Value 5</td></tr>
    <tr><td>Key 6</td><td>Value 6</td></tr>
    <tr><td>Key 7</td><td>Value 7</td></tr>
    <tr><td>Key 8</td><td>Value 8</td></tr>
    <tr><td>Key 9</td><td>Value 9</td></tr>
  </table>
</body>
</html>
`;

const dom = new JSDOM(htmlString);
const document = dom.window.document;

function parseTableOld(document: Document): Map<string, string> {
  const table = document.querySelector("body > table");
  if (!table) {
    return new Map();
  }

  const tableDataMap = new Map<string, string>();
  for (const row of table.querySelectorAll("tr")) {
    const cells = Array.from(row.querySelectorAll("td"))
      .map((td) => td.textContent?.trim())
      .filter(Boolean); // This removes any falsy values, including empty strings

    if (cells.length >= 2) {
      const key = (cells[0] ?? "").replace(":", "").trim();
      const value = cells[1] || "";
      const normalizedKey = key.toLowerCase().replace(/\s+/g, " ").trim();
      tableDataMap.set(normalizedKey, value);
    }
  }

  return tableDataMap;
}

function parseTableNew(document: Document): Map<string, string> {
  const table = document.querySelector("body > table");
  if (!table) {
    return new Map();
  }

  const tableDataMap = new Map<string, string>();
  for (const row of table.querySelectorAll("tr")) {
    const tds = row.querySelectorAll("td");

    let key = "";
    let value = "";
    let found = 0;

    for (let i = 0; i < tds.length; i++) {
      const text = tds[i].textContent?.trim();
      if (text) {
        if (found === 0) {
          key = text;
          found++;
        } else if (found === 1) {
          value = text;
          found++;
          break;
        }
      }
    }

    if (found >= 2) {
      const normalizedKey = key
        .replace(":", "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      tableDataMap.set(normalizedKey, value);
    }
  }

  return tableDataMap;
}

bench("parseTable - Old", () => {
  parseTableOld(document);
});

bench("parseTable - New", () => {
  parseTableNew(document);
});

await run();
