/**
 * Asynchronous function that fetches HTML content from a specified URL.
 *
 * @param id - The ID of the paper to fetch.
 * @returns A Promise that resolves to the fetched HTML content.
 */
async function fetchHtml(id: string): Promise<string> {
  const res = await fetch(`https://ling.auf.net/lingbuzz/${id}`);
  console.log(`Getting paper ${id}`);
  return res.text();
}

/**
 * Asynchronous function that retrieves HTML content for a specified paper ID.
 *
 * @param id - The ID of the paper to retrieve HTML content for.
 * @returns A Promise that resolves to the retrieved HTML content.
 */
export async function getHtml(id: string): Promise<string> {
  const html = await fetchHtml(id);
  return html;
}
