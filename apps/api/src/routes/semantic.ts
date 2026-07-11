import { selectPaperByLingbuzzId } from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import type { Variables } from "../types";
import { clamp, parseInteger } from "../utils";

interface Bindings {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const semantic = new Hono<{ Bindings: Bindings; Variables: Variables }>();

semantic.get("/", async (c) => {
  const rawQuery = c.req.query("q");
  if (!rawQuery || rawQuery.trim().length === 0) {
    return c.json({ error: "Query parameter 'q' is required" }, 400);
  }

  const query = rawQuery.trim();
  const limit = clamp(
    parseInteger(c.req.query("limit"), DEFAULT_LIMIT),
    MIN_LIMIT,
    MAX_LIMIT
  );

  try {
    const embeddingResponse = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
      text: [query],
    });
    const embeddingData =
      "data" in embeddingResponse ? embeddingResponse.data : undefined;
    if (!Array.isArray(embeddingData) || embeddingData.length < 1) {
      throw new Error("Unexpected AI response shape");
    }
    const vector = embeddingData[0];

    const vectorResults = await c.env.VECTORIZE.query(vector, {
      topK: limit,
      returnMetadata: "all",
    });

    const data = await Promise.all(
      vectorResults.matches.map(async (match) => {
        const lingbuzzId = match.id;
        const paper = await selectPaperByLingbuzzId(c.get("db"), lingbuzzId);
        return {
          score: match.score,
          lingbuzzId,
          title: (match.metadata?.title as string) ?? null,
          paper: paper ?? null,
        };
      })
    );

    return c.json({ query, limit, data });
  } catch {
    return c.json({ error: "Failed to perform semantic search" }, 500);
  }
});

export default semantic;
