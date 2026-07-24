import {
  selectPaperByLingbuzzId,
  selectPapers,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import type { Variables } from "../types";
import { clamp, parseInteger } from "../utils";

const papers = new Hono<{ Variables: Variables }>();
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;
const MAX_OFFSET = 10_000;

papers.get("/", async (c) => {
  const limit = clamp(
    parseInteger(c.req.query("limit"), DEFAULT_LIMIT),
    MIN_LIMIT,
    MAX_LIMIT
  );
  const offset = clamp(
    parseInteger(c.req.query("offset"), DEFAULT_OFFSET),
    DEFAULT_OFFSET,
    MAX_OFFSET
  );

  const results = await selectPapers(c.get("db"), { limit, offset });
  return c.json({ limit, offset, data: results });
});

papers.get("/recent", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") || "10"), 50);
  const results = await selectPapers(c.get("db"), { limit });
  return c.json({ data: results });
});

papers.get("/:id", async (c) => {
  const id = c.req.param("id");
  const paper = await selectPaperByLingbuzzId(c.get("db"), id);

  if (!paper) {
    return c.json({ error: "Paper not found" }, 404);
  }

  return c.json({ data: paper });
});

export default papers;
