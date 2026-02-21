import { JSDOM } from "jsdom";
import { fetchWithRetry } from "./utils/retry";

/**
 * Fetches an author's profile page and extracts email, affiliation, and website.
 */
export async function fetchAuthorProfile(authorUrl: string): Promise<{
  email: string;
  affiliation: string;
  website: string;
}> {
  const res = await fetchWithRetry(authorUrl);
  const html = await res.text();
  const document = new JSDOM(html).window.document;

  const email =
    document
      .querySelector("body > table > tbody > tr:nth-child(2) > td.value")
      ?.textContent?.replace(" @ ", "@") || "";
  const affiliation =
    document.querySelector("body > table > tbody > tr:nth-child(3) > td.value")
      ?.textContent || "";
  const website =
    document.querySelector("body > table > tbody > tr:nth-child(4) > td.value")
      ?.textContent || "";

  return { email, affiliation, website };
}
