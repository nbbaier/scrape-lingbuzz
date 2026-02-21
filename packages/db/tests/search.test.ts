import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const BREAKPOINT = "--> statement-breakpoint";
const FTS_MIGRATION_PATH = new URL(
  "../migrations/20260217103528_fts5_search.sql",
  import.meta.url
);

type SearchModule = typeof import("../src/queries/search");
type DbModule = typeof import("../src");

interface TestContext {
  db: DbModule["default"];
  search: SearchModule;
  tempDir: string;
}

const BASE_SCHEMA_STATEMENTS = [
  `CREATE TABLE papers (
    paper_id INTEGER PRIMARY KEY,
    lingbuzz_id TEXT NOT NULL UNIQUE,
    paper_title TEXT NOT NULL,
    abstract TEXT
  )`,
  `CREATE TABLE keywords (
    keyword_id INTEGER PRIMARY KEY,
    keyword TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE keywords_to_papers (
    keyword_id INTEGER NOT NULL,
    paper_id INTEGER NOT NULL,
    PRIMARY KEY (keyword_id, paper_id)
  )`,
  `CREATE TABLE authors (
    author_id INTEGER PRIMARY KEY,
    first_name TEXT,
    last_name TEXT
  )`,
  `CREATE TABLE authors_to_papers (
    author_id INTEGER NOT NULL,
    paper_id INTEGER NOT NULL,
    author_position INTEGER NOT NULL,
    PRIMARY KEY (author_id, paper_id)
  )`,
] as const;

describe.sequential("search queries", () => {
  let context: TestContext;
  let previousDatabaseUrl: string | undefined;
  let previousAuthToken: string | undefined;

  beforeEach(async () => {
    previousDatabaseUrl = process.env.TURSO_DATABASE_URL;
    previousAuthToken = process.env.TURSO_AUTH_TOKEN;

    const tempDir = await mkdtemp(join(tmpdir(), "lingbuzz-db-search-"));
    const dbPath = join(tempDir, "test.db");

    process.env.TURSO_DATABASE_URL = `file:${dbPath}`;
    process.env.TURSO_AUTH_TOKEN = "test-token";

    vi.resetModules();

    const [dbModule, searchModule] = await Promise.all([
      import("../src"),
      import("../src/queries/search"),
    ]);

    context = {
      db: dbModule.default,
      search: searchModule,
      tempDir,
    };

    await setupBaseSchema(context.db);
  });

  test("returns scoped matches and counts after initial FTS population", async () => {
    await seedInitialData(context.db);
    await applyFtsMigration(context.db);

    const allFieldResults = await context.search.searchPapers({
      query: "syntax",
      field: "all",
    });
    expect(allFieldResults).toHaveLength(1);
    expect(allFieldResults[0]?.lingbuzzId).toBe("000001");

    const titleFieldResults = await context.search.searchPapers({
      query: "phonology",
      field: "title",
    });
    expect(titleFieldResults).toHaveLength(1);
    expect(titleFieldResults[0]?.lingbuzzId).toBe("000002");

    const keywordCount = await context.search.searchPapersCount({
      query: "morphology",
      field: "keywords",
    });
    expect(keywordCount).toBe(1);
  });

  test("keeps FTS rows synchronized via relation and authoritative-update triggers", async () => {
    await applyFtsMigration(context.db);

    await runStatement(
      context.db,
      "INSERT INTO papers (paper_id, lingbuzz_id, paper_title, abstract) VALUES (10, '000010', 'Tone in Questions', 'Pilot abstract')"
    );
    await runStatement(
      context.db,
      "INSERT INTO keywords (keyword_id, keyword) VALUES (10, 'xylophonics')"
    );
    await runStatement(
      context.db,
      "INSERT INTO authors (author_id, first_name, last_name) VALUES (10, 'Ada', 'Lovelace')"
    );
    await runStatement(
      context.db,
      "INSERT INTO keywords_to_papers (keyword_id, paper_id) VALUES (10, 10)"
    );
    await runStatement(
      context.db,
      "INSERT INTO authors_to_papers (author_id, paper_id, author_position) VALUES (10, 10, 1)"
    );

    const keywordResults = await context.search.searchPapers({
      query: "xylophonics",
      field: "keywords",
    });
    expect(keywordResults).toHaveLength(1);
    expect(keywordResults[0]?.lingbuzzId).toBe("000010");

    const authorResults = await context.search.searchPapers({
      query: "Lovelace",
      field: "authors",
    });
    expect(authorResults).toHaveLength(1);

    await runStatement(
      context.db,
      "UPDATE keywords SET keyword = 'prosodics' WHERE keyword_id = 10"
    );
    const oldKeywordCount = await context.search.searchPapersCount({
      query: "xylophonics",
      field: "keywords",
    });
    expect(oldKeywordCount).toBe(0);
    const newKeywordCount = await context.search.searchPapersCount({
      query: "prosodics",
      field: "keywords",
    });
    expect(newKeywordCount).toBe(1);

    await runStatement(
      context.db,
      "UPDATE authors SET last_name = 'Turing' WHERE author_id = 10"
    );
    const oldAuthorCount = await context.search.searchPapersCount({
      query: "Lovelace",
      field: "authors",
    });
    expect(oldAuthorCount).toBe(0);
    const newAuthorCount = await context.search.searchPapersCount({
      query: "Turing",
      field: "authors",
    });
    expect(newAuthorCount).toBe(1);

    await runStatement(
      context.db,
      "DELETE FROM keywords_to_papers WHERE keyword_id = 10 AND paper_id = 10"
    );
    const removedKeywordCount = await context.search.searchPapersCount({
      query: "prosodics",
      field: "keywords",
    });
    expect(removedKeywordCount).toBe(0);
  });

  test("rebuildFtsIndex repopulates the index from base tables", async () => {
    await applyFtsMigration(context.db);

    await runStatement(
      context.db,
      "INSERT INTO papers (paper_id, lingbuzz_id, paper_title, abstract) VALUES (20, '000020', 'Morphology Workshop', 'Testing rebuild flow')"
    );

    const baselineCount = await context.search.searchPapersCount({
      query: "morphology",
      field: "title",
    });
    expect(baselineCount).toBe(1);

    await runStatement(context.db, "DELETE FROM papers_fts");
    const clearedCount = await context.search.searchPapersCount({
      query: "morphology",
      field: "title",
    });
    expect(clearedCount).toBe(0);

    await context.search.rebuildFtsIndex();
    const rebuiltCount = await context.search.searchPapersCount({
      query: "morphology",
      field: "title",
    });
    expect(rebuiltCount).toBe(1);
  });

  test("throws SearchSyntaxError on malformed FTS query", async () => {
    await applyFtsMigration(context.db);

    await expect(
      context.search.searchPapers({
        query: '"',
      })
    ).rejects.toBeInstanceOf(context.search.SearchSyntaxError);
  });

  test("clamps pagination values", async () => {
    await seedInitialData(context.db);
    await applyFtsMigration(context.db);

    const results = await context.search.searchPapers({
      query: "syntax OR phonology",
      limit: 999,
      offset: -10,
    });
    expect(results).toHaveLength(2);
  });

  afterEach(async () => {
    await rm(context.tempDir, { recursive: true, force: true });

    if (previousDatabaseUrl === undefined) {
      process.env.TURSO_DATABASE_URL = undefined;
    } else {
      process.env.TURSO_DATABASE_URL = previousDatabaseUrl;
    }

    if (previousAuthToken === undefined) {
      process.env.TURSO_AUTH_TOKEN = undefined;
    } else {
      process.env.TURSO_AUTH_TOKEN = previousAuthToken;
    }
  });
});

async function setupBaseSchema(db: DbModule["default"]): Promise<void> {
  for (const statement of BASE_SCHEMA_STATEMENTS) {
    await runStatement(db, statement);
  }
}

async function applyFtsMigration(db: DbModule["default"]): Promise<void> {
  const migrationSql = await readFile(FTS_MIGRATION_PATH, "utf8");
  const statements = migrationSql
    .split(BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await runStatement(db, statement);
  }
}

async function seedInitialData(db: DbModule["default"]): Promise<void> {
  await runStatement(
    db,
    "INSERT INTO papers (paper_id, lingbuzz_id, paper_title, abstract) VALUES (1, '000001', 'Syntax and Meaning', 'This syntax paper studies agreement')"
  );
  await runStatement(
    db,
    "INSERT INTO papers (paper_id, lingbuzz_id, paper_title, abstract) VALUES (2, '000002', 'Phonology Primer', 'Segmental phonology overview')"
  );
  await runStatement(
    db,
    "INSERT INTO keywords (keyword_id, keyword) VALUES (1, 'syntax')"
  );
  await runStatement(
    db,
    "INSERT INTO keywords (keyword_id, keyword) VALUES (2, 'morphology')"
  );
  await runStatement(
    db,
    "INSERT INTO keywords (keyword_id, keyword) VALUES (3, 'phonology')"
  );
  await runStatement(
    db,
    "INSERT INTO keywords_to_papers (keyword_id, paper_id) VALUES (1, 1)"
  );
  await runStatement(
    db,
    "INSERT INTO keywords_to_papers (keyword_id, paper_id) VALUES (2, 1)"
  );
  await runStatement(
    db,
    "INSERT INTO keywords_to_papers (keyword_id, paper_id) VALUES (3, 2)"
  );
  await runStatement(
    db,
    "INSERT INTO authors (author_id, first_name, last_name) VALUES (1, 'Jane', 'Syntax')"
  );
  await runStatement(
    db,
    "INSERT INTO authors (author_id, first_name, last_name) VALUES (2, 'Paul', 'Phonology')"
  );
  await runStatement(
    db,
    "INSERT INTO authors_to_papers (author_id, paper_id, author_position) VALUES (1, 1, 1)"
  );
  await runStatement(
    db,
    "INSERT INTO authors_to_papers (author_id, paper_id, author_position) VALUES (2, 2, 1)"
  );
}

async function runStatement(
  db: DbModule["default"],
  statement: string
): Promise<void> {
  await db.run(statement);
}
