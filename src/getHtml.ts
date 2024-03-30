async function fetchHtml(id: string): Promise<string> {
  const res = await fetch(`https://ling.auf.net/lingbuzz/${id}`);
  console.log(`Getting paper ${id}`);
  return res.text();
}
export async function getHtml(id: string): Promise<string> {
  const html = await fetchHtml(id);
  return html;
}
