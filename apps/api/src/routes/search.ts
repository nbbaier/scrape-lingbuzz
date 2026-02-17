import {
  type SearchField,
  SearchSyntaxError,
  searchPapers,
  searchPapersCount,
} from "@lingbuzz/db/queries/search";
import { Hono } from "hono";

const search = new Hono();
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;
const SEARCH_FIELDS: SearchField[] = [
  "all",
  "title",
  "abstract",
  "keywords",
  "authors",
];

search.get("/", async (c) => {
  const rawQuery = c.req.query("q");
  if (!rawQuery || rawQuery.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  const rawField = c.req.query("field");
  if (rawField && !isSearchField(rawField)) {
    return c.json(
      {
        error: `Invalid field. Must be one of: ${SEARCH_FIELDS.join(", ")}`,
      },
      400
    );
  }

  const field: SearchField =
    rawField && isSearchField(rawField) ? rawField : "all";
  const query = rawQuery.trim();
  const limit = clamp(
    parseInteger(c.req.query("limit"), DEFAULT_LIMIT),
    MIN_LIMIT,
    MAX_LIMIT
  );
  const offset = Math.max(
    parseInteger(c.req.query("offset"), DEFAULT_OFFSET),
    DEFAULT_OFFSET
  );

  try {
    const [data, total] = await Promise.all([
      searchPapers({
        query,
        field,
        limit,
        offset,
      }),
      searchPapersCount({
        query,
        field,
      }),
    ]);

    return c.json({
      query,
      field,
      total,
      limit,
      offset,
      data,
    });
  } catch (error: unknown) {
    if (error instanceof SearchSyntaxError) {
      return c.json({ error: "Invalid search query syntax" }, 400);
    }

    return c.json({ error: "Failed to search papers" }, 500);
  }
});

function parseInteger(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function isSearchField(field: string): field is SearchField {
  return SEARCH_FIELDS.includes(field as SearchField);
}

export default search;
