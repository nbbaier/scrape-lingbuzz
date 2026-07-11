import { createDb } from "../src/client";
import { rebuildFtsIndex } from "../src/queries/search";

const db = createDb({
  url: process.env.TURSO_DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

await rebuildFtsIndex(db);
