import { createDb } from "../src/client";
import { rebuildFtsIndex } from "../src/queries/search";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

const db = createDb({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await rebuildFtsIndex(db);
