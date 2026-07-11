import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createDb, type Db } from "../src/client";
import {
  rebuildFtsIndex,
  SearchSyntaxError,
  searchPapers,
  searchPapersCount,
} from "../src/queries/search";

const BREAKPOINT = "--> statement-breakpoint";
const FTS_MIGRATION_PATH = new URL(
  "../migrations/20260217103528_fts5_search.sql",
  import.meta.url
);

interface TestContext {
  db: Db;
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

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "lingbuzz-db-search-"));
    const dbPath = join(tempDir, "test.db");

    const db = createDb({ url: `file:${dbPath}` });

    context = { db, tempDir };

    await setupBaseSchema(context.db);
  });

  test("returns scoped matches and counts after initial FTS population", async () => {
    await seedInitialData(context.db);
    await applyFtsMigration(context.db);

    const allFieldResults = await searchPapers(context.db, {
      query: "syntax",
      field: "all",
    });
    expect(allFieldResults).toHaveLength(1);
    expect(allFieldResults[0]?.lingbuzzId).toBe("000001");

    const titleFieldResults = await searchPapers(context.db, {
      query: "phonology",
      field: "title",
    });
    expect(titleFieldResults).toHaveLength(1);
    expect(titleFieldResults[0]?.lingbuzzId).toBe("000002");

    const keywordCount = await searchPapersCount(context.db, {
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

    const keywordResults = await searchPapers(context.db, {
      query: "xylophonics",
      field: "keywords",
    });
    expect(keywordResults).toHaveLength(1);
    expect(keywordResults[0]?.lingbuzzId).toBe("000010");

    const authorResults = await searchPapers(context.db, {
      query: "Lovelace",
      field: "authors",
    });
    expect(authorResults).toHaveLength(1);

    await runStatement(
      context.db,
      "UPDATE keywords SET keyword = 'prosodics' WHERE keyword_id = 10"
    );
    const oldKeywordCount = await searchPapersCount(context.db, {
      query: "xylophonics",
      field: "keywords",
    });
    expect(oldKeywordCount).toBe(0);
    const newKeywordCount = await searchPapersCount(context.db, {
      query: "prosodics",
      field: "keywords",
    });
    expect(newKeywordCount).toBe(1);

    await runStatement(
      context.db,
      "UPDATE authors SET last_name = 'Turing' WHERE author_id = 10"
    );
    const oldAuthorCount = await searchPapersCount(context.db, {
      query: "Lovelace",
      field: "authors",
    });
    expect(oldAuthorCount).toBe(0);
    const newAuthorCount = await searchPapersCount(context.db, {
      query: "Turing",
      field: "authors",
    });
    expect(newAuthorCount).toBe(1);

    await runStatement(
      context.db,
      "DELETE FROM keywords_to_papers WHERE keyword_id = 10 AND paper_id = 10"
    );
    const removedKeywordCount = await searchPapersCount(context.db, {
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

    const baselineCount = await searchPapersCount(context.db, {
      query: "morphology",
      field: "title",
    });
    expect(baselineCount).toBe(1);

    await runStatement(context.db, "DELETE FROM papers_fts");
    const clearedCount = await searchPapersCount(context.db, {
      query: "morphology",
      field: "title",
    });
    expect(clearedCount).toBe(0);

    await rebuildFtsIndex(context.db);
    const rebuiltCount = await searchPapersCount(context.db, {
      query: "morphology",
      field: "title",
    });
    expect(rebuiltCount).toBe(1);
  });

  test("throws SearchSyntaxError on malformed FTS query", async () => {
    await applyFtsMigration(context.db);

    await expect(
      searchPapers(context.db, {
        query: '"',
      })
    ).rejects.toBeInstanceOf(SearchSyntaxError);
  });

  test("clamps pagination values", async () => {
    await seedInitialData(context.db);
    await applyFtsMigration(context.db);

    const results = await searchPapers(context.db, {
      query: "syntax OR phonology",
      limit: 999,
      offset: -10,
    });
    expect(results).toHaveLength(2);
  });

  afterEach(async () => {
    await rm(context.tempDir, { recursive: true, force: true });
  });
});

async function setupBaseSchema(db: Db): Promise<void> {
  for (const statement of BASE_SCHEMA_STATEMENTS) {
    await runStatement(db, statement);
  }
}

async function applyFtsMigration(db: Db): Promise<void> {
  const migrationSql = await readFile(FTS_MIGRATION_PATH, "utf8");
  const statements = migrationSql
    .split(BREAKPOINT)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);

  for (const statement of statements) {
    await runStatement(db, statement);
  }
}

async function seedInitialData(db: Db): Promise<void> {
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

async function runStatement(db: Db, statement: string): Promise<void> {
  await db.run(statement);
}
