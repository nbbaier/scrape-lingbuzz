import { describe, expect, test } from "bun:test";
import { parsePaper } from "../parsing";

describe("parsePaper", () => {
	test("successfully parses a valid paper HTML", () => {
		const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Some Title - LingBuzz</title>
            </head>
            <body>
                <center>
                    A Great Paper on Linguistics<br>
                    John Doe, Jane Smith<br>
                    January 2024
                </center>
                <table>
                    <tr><td>Published in:</td><td>Journal of Linguistics</td></tr>
                    <tr><td>keywords:</td><td>syntax, semantics, morphology</td></tr>
                    <tr><td>Downloaded:</td><td>42 times</td></tr>
                </table>
                <br>
                <br>
                This is the abstract text. It describes the paper.
            </body>
            </html>
        `;

		const result = parsePaper(html, "001234");

		expect(result).not.toBeNull();
		expect(result?.id).toBe("001234");
		expect(result?.title).toBe("A Great Paper on Linguistics");
		expect(result?.authors).toEqual(["John Doe", "Jane Smith"]);
		expect(result?.date).toBe("January 2024");
		expect(result?.published_in).toBe("Journal of Linguistics");
		expect(result?.keywords).toEqual(["syntax", "semantics", "morphology"]);
		expect(result?.abstract).toBe("This is the abstract text. It describes the paper.");
		expect(result?.downloads).toBe(42);
		expect(result?.link).toBe("https://ling.auf.net/lingbuzz/001234");
	});

	test("returns null when title matches the main page title (no paper)", () => {
		const html = `
            <html>
            <head><title>lingbuzz - archive of linguistics articles</title></head>
            <body></body>
            </html>
        `;
		const result = parsePaper(html, "009999");
		expect(result).toBeNull();
	});

	test("returns null when header information is missing", () => {
		const html = `
            <html>
            <head><title>Some Paper</title></head>
            <body>
                <center>Only Title Here</center>
            </body>
            </html>
        `;
		// parseCenterElement will return ["Only Title Here"], so authors (index 1) will be undefined.
		const result = parsePaper(html, "001235");
		expect(result).toBeNull();
	});

	test("handles missing optional fields correctly", () => {
		const html = `
            <html>
            <head><title>Title</title></head>
            <body>
                <center>
                    Minimal Paper<br>
                    Author Name
                </center>
                <!-- No table, no abstract -->
            </body>
            </html>
        `;
		const result = parsePaper(html, "001236");

		expect(result).not.toBeNull();
		expect(result?.title).toBe("Minimal Paper");
		expect(result?.authors).toEqual(["Author Name"]);
		expect(result?.date).toBe(""); // Fallback
		expect(result?.published_in).toBe(""); // Fallback
		expect(result?.keywords).toEqual([""]); // Fallback from splitKeywords("") -> [""]? Let's check logic.
		expect(result?.downloads).toBe(0); // Fallback
	});
});
