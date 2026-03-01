import {
  markPapersEmbedded,
  selectUnembeddedPapers,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";

interface Bindings {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  ADMIN_TOKEN: string;
}

const BATCH_SIZE = 100;
const MAX_PAPERS = 500;

const admin = new Hono<{ Bindings: Bindings }>();

admin.use("*", async (c, next) => {
  const auth = bearerAuth({ token: c.env.ADMIN_TOKEN });
  await auth(c, next);
});

admin.post("/embed", async (c) => {
  const unembedded = await selectUnembeddedPapers({ limit: MAX_PAPERS });

  if (unembedded.length === 0) {
    return c.json({ embedded: 0, remaining: 0 });
  }

  let embedded = 0;
  const errors: string[] = [];

  for (let i = 0; i < unembedded.length; i += BATCH_SIZE) {
    const batch = unembedded.slice(i, i + BATCH_SIZE);

    try {
      const texts = batch.map((p) => `${p.paperTitle}. ${p.abstract ?? ""}`);

      const embeddingResponse = await c.env.AI.run(
        "@cf/baai/bge-base-en-v1.5",
        { text: texts }
      );

      const vectors = batch.map((p, idx) => ({
        id: p.lingbuzzId,
        values: embeddingResponse.data[idx],
        metadata: {
          lingbuzzId: p.lingbuzzId,
          title: p.paperTitle,
          paperId: p.paperId,
        },
      }));

      await c.env.VECTORIZE.upsert(vectors);

      const paperIds = batch.map((p) => p.paperId);
      await markPapersEmbedded(paperIds);

      embedded += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE)}: ${message}`);
    }
  }

  const remainingPapers = await selectUnembeddedPapers({ limit: 1 });
  const remaining =
    remainingPapers.length > 0 ? unembedded.length - embedded : 0;

  const result: Record<string, unknown> = { embedded, remaining };
  if (errors.length > 0) {
    result.errors = errors;
  }

  return c.json(result);
});

export default admin;
