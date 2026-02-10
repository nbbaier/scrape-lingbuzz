import { describe, expect, test, vi, afterEach } from "vitest";
import { getPaperCount } from "../utils/utils";

describe("getPaperCount", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("successfully extracts paper count from HTML", async () => {
    const html = `
      <html>
        <body>
          <center>
            <b>
              <a href="/lingbuzz/_listing?start=1">Showing 1-100 of 8234 papers</a>
            </b>
          </center>
        </body>
      </html>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(html),
    } as any);

    const count = await getPaperCount("http://fakeurl.com");
    expect(count).toBe(8234);
  });

  test("handles extra whitespace and different tag cases", async () => {
    const html = `
      <CENTER>
        <B>
          <A HREF="...">Showing 501-600 of 500 papers</A>
        </B>
      </CENTER>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(html),
    } as any);

    const count = await getPaperCount("http://fakeurl.com");
    expect(count).toBe(500);
  });

  test("handles multiple numbers and takes the last one", async () => {
    const html = `
      <center><b><a href="...">Archive contains 123 categories and 9999 papers</a></b></center>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(html),
    } as any);

    const count = await getPaperCount("http://fakeurl.com");
    expect(count).toBe(9999);
  });

  test("strips internal HTML tags in <a>", async () => {
    const html = `
      <center><b><a href="...">Showing <b>1</b> to 100 of <i>7777</i> papers</a></b></center>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(html),
    } as any);

    const count = await getPaperCount("http://fakeurl.com");
    expect(count).toBe(7777);
  });

  test("handles newlines in <a> tag", async () => {
    const html = `
      <center>
        <b>
          <a href="...">
            Showing 1-100 of
            9000 papers
          </a>
        </b>
      </center>
    `;

    global.fetch = vi.fn().mockResolvedValue({
      text: () => Promise.resolve(html),
    } as any);

    const count = await getPaperCount("http://fakeurl.com");
    expect(count).toBe(9000);
  });
});
