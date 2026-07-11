import {
  selectAuthorByUsername,
  selectPapersByAuthorId,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";
import type { Variables } from "../types";

const authors = new Hono<{ Variables: Variables }>();

authors.get("/:username", async (c) => {
  const username = c.req.param("username");
  const author = await selectAuthorByUsername(c.get("db"), username);

  if (!author) {
    return c.json({ error: "Author not found" }, 404);
  }

  const papers = await selectPapersByAuthorId(c.get("db"), author.authorId);

  return c.json({
    data: {
      ...author,
      papers,
    },
  });
});

export default authors;
