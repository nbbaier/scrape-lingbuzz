import {
  selectAuthorByUsername,
  selectPapersByAuthorId,
} from "@lingbuzz/db/queries/select";
import { Hono } from "hono";

const authors = new Hono();

authors.get("/:username", async (c) => {
  const username = c.req.param("username");
  const author = await selectAuthorByUsername(username);

  if (!author) {
    return c.json({ error: "Author not found" }, 404);
  }

  const papers = await selectPapersByAuthorId(author.authorId);

  return c.json({
    data: {
      ...author,
      papers,
    },
  });
});

export default authors;
