import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import { parseListingRow } from "../src/listing";

function createRow(html: string): HTMLTableRowElement {
  const dom = new JSDOM(`<table><tbody><tr>${html}</tr></tbody></table>`);
  return dom.window.document.querySelector("tr") as HTMLTableRowElement;
}

describe("parseListingRow", () => {
  test("parses a 'new' paper row", () => {
    const row = createRow(`
      <td><a href="/_person/jdoe">Doe, John</a></td>
      <td>new</td>
      <td><a href="/lingbuzz/007001/current.pdf?_s=abc">pdf</a></td>
      <td><a href="/lingbuzz/007001">A New Paper</a></td>
    `);

    const result = parseListingRow(row);
    expect(result).not.toBeNull();
    expect(result?.paperId).toBe("007001");
    expect(result?.title).toBe("A New Paper");
    expect(result?.status).toBe("new");
    expect(result?.authors.size).toBe(1);
    expect(result?.authors.get(1)?.lastName).toBe("Doe");
    expect(result?.authors.get(1)?.firstName).toBe("John");
    expect(result?.authors.get(1)?.username).toBe("jdoe");
    expect(result?.downloadUrl).toBe(
      "https://ling.auf.net/lingbuzz/007001/current.pdf"
    );
    expect(result?.paperUrl).toBe("https://ling.auf.net/lingbuzz/007001");
  });

  test("parses a 'freshly changed' paper row", () => {
    const row = createRow(`
      <td>
        <a href="/_person/asmith">Smith, Alice</a>,
        <a href="/_person/bjones">Jones, Bob</a>
      </td>
      <td>freshly changed</td>
      <td><a href="/lingbuzz/006500/current.pdf">pdf</a></td>
      <td><a href="/lingbuzz/006500">An Updated Paper</a></td>
    `);

    const result = parseListingRow(row);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("freshly changed");
    expect(result?.authors.size).toBe(2);
    expect(result?.authors.get(1)?.username).toBe("asmith");
    expect(result?.authors.get(2)?.username).toBe("bjones");
  });

  test("parses a date-only status row", () => {
    const row = createRow(`
      <td><a href="/_person/clee">Lee, Chris</a></td>
      <td>2026-01</td>
      <td><a href="/lingbuzz/005000/current.pdf">pdf</a></td>
      <td><a href="/lingbuzz/005000">An Older Paper</a></td>
    `);

    const result = parseListingRow(row);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("2026-01");
    expect(result?.paperId).toBe("005000");
  });

  test("returns null for rows with fewer than 4 cells", () => {
    const row = createRow(`
      <td>Only one cell</td>
      <td>Two cells</td>
    `);

    const result = parseListingRow(row);
    expect(result).toBeNull();
  });

  test("handles multiple authors with positions", () => {
    const row = createRow(`
      <td>
        <a href="/_person/first">First, Author</a>,
        <a href="/_person/second">Second, Author</a>,
        <a href="/_person/third">Third, Author</a>
      </td>
      <td>new</td>
      <td><a href="/lingbuzz/007002/current.pdf">pdf</a></td>
      <td><a href="/lingbuzz/007002">Multi Author Paper</a></td>
    `);

    const result = parseListingRow(row);
    expect(result).not.toBeNull();
    expect(result?.authors.size).toBe(3);
    expect(result?.authors.get(1)?.username).toBe("first");
    expect(result?.authors.get(2)?.username).toBe("second");
    expect(result?.authors.get(3)?.username).toBe("third");
  });

  test("handles missing download link", () => {
    const row = createRow(`
      <td><a href="/_person/jdoe">Doe, John</a></td>
      <td>new</td>
      <td></td>
      <td><a href="/lingbuzz/007003">No PDF Paper</a></td>
    `);

    const result = parseListingRow(row);
    expect(result).not.toBeNull();
    expect(result?.downloadUrl).toBe("");
  });
});
