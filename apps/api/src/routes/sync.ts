import { selectLatestSyncRun } from "@lingbuzz/db/queries/sync";
import { Hono } from "hono";
import type { Variables } from "../types";

const sync = new Hono<{ Variables: Variables }>();

sync.get("/latest", async (c) => {
  const latest = await selectLatestSyncRun(c.get("db"));

  if (!latest) {
    return c.json({ error: "No sync runs recorded" }, 404);
  }

  return c.json({
    data: {
      runner: latest.runner,
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt,
      papersNew: latest.papersNew,
      papersUpdated: latest.papersUpdated,
      success: latest.success,
    },
  });
});

export default sync;
