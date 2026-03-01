import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import db from "../src";

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
