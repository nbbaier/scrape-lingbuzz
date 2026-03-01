import { Hono } from "hono";
import admin from "./routes/admin";
import authors from "./routes/authors";
import papers from "./routes/papers";
import search from "./routes/search";
import semantic from "./routes/semantic";

interface Bindings {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  ADMIN_TOKEN: string;
}

const app = new Hono<{ Bindings: Bindings }>();

// Stopgap: set process.env from Worker bindings for @lingbuzz/db
app.use("*", async (c, next) => {
  process.env.TURSO_DATABASE_URL = c.env.TURSO_DATABASE_URL;
  process.env.TURSO_AUTH_TOKEN = c.env.TURSO_AUTH_TOKEN;
  await next();
});

app.route("/papers", papers);
app.route("/authors", authors);
app.route("/search/semantic", semantic);
app.route("/search", search);
app.route("/admin", admin);

app.get("/", (c) => {
  return c.json({ message: "lingbuzz API" });
});

export default app;
