import { JSDOM } from "jsdom";
import { describe, expect, test } from "vitest";
import {
  parseAbstract,
  parseCenterElement,
  parseTable,
} from "../parsingHelpers";

describe("parseCenterElement", () => {
  test("extracts title, authors, and date from center element", () => {
    const html = `
			<html>
				<body>
					<center>
						Title of the Paper<br>
						Author One, Author Two<br>
						January 2024
					</center>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseCenterElement(document);

    expect(result).toHaveLength(3);
    expect(result[0]).toBe("Title of the Paper");
    expect(result[1]).toBe("Author One, Author Two");
    expect(result[2]).toBe("January 2024");
  });

  test("returns empty array when center element is missing", () => {
    const html = "<html><body><div>No center element</div></body></html>";
    const document = new JSDOM(html).window.document;
    const result = parseCenterElement(document);

    expect(result).toEqual([]);
  });

  test("handles self-closing br tags", () => {
    const html = `
			<html>
				<body>
					<center>
						Title<br/>
						Authors<br />
						Date
					</center>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseCenterElement(document);

    expect(result).toHaveLength(3);
  });

  test("strips HTML tags from lines", () => {
    const html = `
			<html>
				<body>
					<center>
						<b>Bold Title</b><br>
						<a href="#">Author Link</a><br>
						<i>Italic Date</i>
					</center>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseCenterElement(document);

    expect(result[0]).toBe("Bold Title");
    expect(result[1]).toBe("Author Link");
    expect(result[2]).toBe("Italic Date");
  });

  test("filters empty lines", () => {
    const html = `
			<html>
				<body>
					<center>
						Title<br>
						<br>
						Authors
					</center>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseCenterElement(document);

    expect(result).toEqual(["Title", "Authors"]);
  });
});

describe("parseTable", () => {
  test("parses table rows into key-value map", () => {
    const html = `
			<html>
				<body>
					<table>
						<tr><td>keywords:</td><td>syntax, semantics</td></tr>
						<tr><td>Published in:</td><td>Linguistic Inquiry</td></tr>
						<tr><td>Downloaded:</td><td>1234 times</td></tr>
					</table>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseTable(document);

    expect(result.get("keywords")).toBe("syntax, semantics");
    expect(result.get("published in")).toBe("Linguistic Inquiry");
    expect(result.get("downloaded")).toBe("1234 times");
  });

  test("returns empty map when table is missing", () => {
    const html = "<html><body><div>No table</div></body></html>";
    const document = new JSDOM(html).window.document;
    const result = parseTable(document);

    expect(result.size).toBe(0);
  });

  test("handles rows with fewer than 2 cells", () => {
    const html = `
			<html>
				<body>
					<table>
						<tr><td>single cell</td></tr>
						<tr><td>key:</td><td>value</td></tr>
					</table>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseTable(document);

    expect(result.size).toBe(1);
    expect(result.get("key")).toBe("value");
  });

  test("strips colon from keys", () => {
    const html = `
			<html>
				<body>
					<table>
						<tr><td>Format:</td><td>PDF</td></tr>
					</table>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseTable(document);

    expect(result.get("format")).toBe("PDF");
  });

  test("trims whitespace from keys and values", () => {
    const html = `
			<html>
				<body>
					<table>
						<tr><td>  key:  </td><td>  value  </td></tr>
					</table>
				</body>
			</html>
		`;
    const document = new JSDOM(html).window.document;
    const result = parseTable(document);

    expect(result.get("key")).toBe("value");
  });
});

describe("parseAbstract", () => {
  test("replaces double quotes with single quotes", () => {
    const input = 'This is a "quoted" word.';
    const result = parseAbstract(input);
    expect(result).toBe("This is a 'quoted' word.");
  });

  test("replaces newlines with spaces", () => {
    const input = "Line one\nLine two\nLine three";
    const result = parseAbstract(input);
    expect(result).toBe("Line one Line two Line three");
  });

  test("collapses multiple spaces", () => {
    const input = "Word    with    many    spaces";
    const result = parseAbstract(input);
    expect(result).toBe("Word with many spaces");
  });

  test("handles combined formatting issues", () => {
    const input = 'This   is   "a"\n\ntest   abstract';
    const result = parseAbstract(input);
    expect(result).toBe("This is 'a' test abstract");
  });

  test("handles empty string", () => {
    const result = parseAbstract("");
    expect(result).toBe("");
  });

  test("handles string with only whitespace", () => {
    const input = "   \n\n   ";
    const result = parseAbstract(input);
    expect(result).toBe("");
  });
});
