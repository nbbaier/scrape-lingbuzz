import { Hono } from "hono";

const search = new Hono();

search.get("/", (c) => {
  const q = c.req.query("q");
  if (!q) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  // Placeholder: LIKE search on title. Replace with FTS5 later.
  return c.json({ data: [], message: "Search not yet implemented" });
});

export default search;
