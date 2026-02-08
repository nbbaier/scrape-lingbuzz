import {
  selectPaperByLingbuzzId,
  selectPapers,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";

const papers = new Hono();

papers.get("/", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") || "20"), 100);

  const results = await selectPapers({ limit });
  return c.json({ limit, data: results });
});

papers.get("/recent", async (c) => {
  const limit = Math.min(Number(c.req.query("limit") || "10"), 50);
  const results = await selectPapers({ limit });
  return c.json({ data: results });
});

papers.get("/:id", async (c) => {
  const id = c.req.param("id");
  const paper = await selectPaperByLingbuzzId(id);

  if (!paper) {
    return c.json({ error: "Paper not found" }, 404);
  }

  return c.json({ data: paper });
});

export default papers;
