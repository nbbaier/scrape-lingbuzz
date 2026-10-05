/**
 * One-off: baseline an existing DB into drizzle's migration journal (issue #71).
 *
 * Records the migrations prod already has (idx 0-1) as applied, so `db:migrate`
 * picks up from there instead of replaying from scratch. Run once, then delete.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@libsql/client";

// prod's schema matches the state after this migration -- see #71
const BASELINE_TAG = "20251024033539_volatile_madripoor";
const MIGRATIONS_DIR = fileURLToPath(new URL("../migrations", import.meta.url));
const TABLE = "__drizzle_migrations__";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error("TURSO_DATABASE_URL is required");
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

const journal = JSON.parse(
  await readFile(join(MIGRATIONS_DIR, "meta/_journal.json"), "utf8")
);

const baselineIdx = journal.entries.findIndex(
  (e: { tag: string }) => e.tag === BASELINE_TAG
);
if (baselineIdx === -1) {
  throw new Error(`${BASELINE_TAG} not found in journal`);
}
const toSeed = journal.entries.slice(0, baselineIdx + 1);

await db.execute(
  `CREATE TABLE IF NOT EXISTS ${TABLE} (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)`
);

const existing = await db.execute(`SELECT COUNT(*) AS n FROM ${TABLE}`);
if (Number(existing.rows[0].n) > 0) {
  throw new Error(`${TABLE} is not empty -- refusing to double-seed`);
}

for (const entry of toSeed) {
  const sql = await readFile(join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");
  await db.execute({
    sql: `INSERT INTO ${TABLE} (hash, created_at) VALUES (?, ?)`,
    args: [hash, entry.when],
  });
  process.stdout.write(`seeded ${entry.tag} (when=${entry.when})\n`);
}

process.stdout.write(
  `\n${toSeed.length} row(s) seeded. Now run: bun run db:migrate\n`
);
