/**
 * Dev tool for authoring FTS migrations. NOT a provisioning path — `db:migrate`
 * owns the FTS schema and applies these migrations like any other.
 *
 * Drizzle has no virtual-table primitive: `papers_fts` is absent from
 * `src/schema/`, so `drizzle-kit generate` cannot produce FTS DDL and every
 * FTS migration is hand-written with a hand-added journal entry. Since
 * `db:migrate` will not re-run a migration once its journal row exists, this
 * script re-applies the FTS SQL unconditionally so it can be iterated on.
 *
 * Constraint: it applies ONLY the newest `*_fts5_search.sql`, so each such
 * migration must be a complete, idempotent redefinition of the whole FTS
 * schema (`CREATE VIRTUAL TABLE IF NOT EXISTS`, `DROP TRIGGER IF EXISTS`
 * before each `CREATE TRIGGER`, full backfill). A migration written as a delta
 * against a previous one would leave this script reconstructing wrong state.
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb } from "../src/client";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error("TURSO_DATABASE_URL environment variable is required");
}

const db = createDb({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const BREAKPOINT = "--> statement-breakpoint";
const FTS_MIGRATION_SUFFIX = "_fts5_search.sql";

async function setupFts5(): Promise<void> {
  const migrationsDir = fileURLToPath(
    new URL("../migrations", import.meta.url)
  );
  const migrationFile = await findFtsMigrationFile(migrationsDir);
  const migrationSql = await readFile(
    join(migrationsDir, migrationFile),
    "utf8"
  );
  const statements = migrationSql
    .split(BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await db.run(statement);
  }
}

async function findFtsMigrationFile(migrationsDir: string): Promise<string> {
  const files = await readdir(migrationsDir);
  const matches = files
    .filter((file) => file.endsWith(FTS_MIGRATION_SUFFIX))
    .sort((left, right) => left.localeCompare(right));

  const newestMigration = matches.at(-1);
  if (!newestMigration) {
    throw new Error(
      `Unable to find an FTS migration matching '*${FTS_MIGRATION_SUFFIX}' in ${migrationsDir}`
    );
  }

  return newestMigration;
}

await setupFts5();
