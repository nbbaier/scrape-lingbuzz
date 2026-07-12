import { createDb } from "@lingbuzz/db";
import { Hono } from "hono";
import admin from "./routes/admin";
import authors from "./routes/authors";
import papers from "./routes/papers";
import search from "./routes/search";
import semantic from "./routes/semantic";
import sync from "./routes/sync";
import type { Variables } from "./types";

interface Bindings {
  ADMIN_TOKEN: string;
  AI: Ai;
  TURSO_AUTH_TOKEN: string;
  TURSO_DATABASE_URL: string;
  VECTORIZE: VectorizeIndex;
}

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  c.set(
    "db",
    createDb({
      url: c.env.TURSO_DATABASE_URL,
      authToken: c.env.TURSO_AUTH_TOKEN,
    })
  );
  await next();
});

app.route("/papers", papers);
app.route("/authors", authors);
app.route("/search/semantic", semantic);
app.route("/search", search);
app.route("/admin", admin);
app.route("/sync", sync);

app.get("/", (c) => {
  return c.json({ message: "lingbuzz API" });
});

export default app;
