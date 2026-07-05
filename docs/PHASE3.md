# Phase 3: Full-Text Search (FTS5) — Implementation Plan

## Context

Phase 2 is complete: the scraper persists papers to Turso and the API serves papers/authors, but the `/search` endpoint is a stub returning empty results. Phase 3 adds FTS5-based full-text search across paper titles, abstracts, keywords, and author names.

## Architecture Overview

Use a single denormalized FTS5 virtual table (`papers_fts`) that combines data from `papers`, `keywords` (via junction), and `authors` (via junction) into one searchable index. Keep it synchronized with SQLite triggers.

Why this design:
- One `MATCH` query can search all fields.
- A regular FTS5 table (not contentless/external-content) supports `snippet()` and `highlight()`.
- `porter unicode61` gives stemming plus Unicode support for linguistics terms.
- Triggers keep index sync in the DB layer so scraper persistence code does not need FTS-specific writes.

## FTS5 Table Schema

```sql
CREATE VIRTUAL TABLE IF NOT EXISTS papers_fts USING fts5(
  paper_id UNINDEXED,
  lingbuzz_id UNINDEXED,
  title,
  abstract,
  keywords,
  authors,
  tokenize='porter unicode61'
);
```

- `paper_id` and `lingbuzz_id` are stored for joins but not indexed for search.
- `title`, `abstract`, `keywords`, and `authors` are searchable text columns.

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/db/migrations/<ts>_fts5_search.sql` | Create | FTS5 table + initial population + 11 sync triggers |
| `packages/db/migrations/meta/_journal.json` | Modify | Append migration entry using next idx (`max(idx) + 1`), not a hardcoded idx |
| `packages/db/src/queries/search.ts` | Create | `searchPapers`, `searchPapersCount`, `rebuildFtsIndex`, typed search error |
| `packages/db/package.json` | Modify | Add `"./queries/search"` export and FTS scripts |
| `packages/db/scripts/rebuild-fts.ts` | Create | Manual full reindex entrypoint (always present) |
| `apps/api/src/routes/search.ts` | Modify | Replace stub with FTS5-backed endpoint |
| root `package.json` | Modify | Add `db:rebuild-fts` convenience script |
| `packages/db/scripts/setup-fts5.ts` | Create (fallback) | Only for environments where migration runner cannot apply FTS SQL |

---

## Step-by-Step Implementation

### Step 1: Create FTS5 Migration

File: `packages/db/migrations/<timestamp>_fts5_search.sql`

#### 1a. Virtual Table Creation

Use the schema above.

#### 1b. Initial Population

Populate `papers_fts` from existing data. Keep author and keyword concatenation deterministic with explicit ordering.

```sql
INSERT INTO papers_fts (paper_id, lingbuzz_id, title, abstract, keywords, authors)
SELECT
  p.paper_id,
  p.lingbuzz_id,
  p.paper_title,
  COALESCE(p.abstract, ''),
  COALESCE(
    (
      SELECT GROUP_CONCAT(keyword, ' ')
      FROM (
        SELECT k.keyword AS keyword
        FROM keywords_to_papers ktp
        JOIN keywords k ON k.keyword_id = ktp.keyword_id
        WHERE ktp.paper_id = p.paper_id
        ORDER BY k.keyword
      )
    ),
    ''
  ),
  COALESCE(
    (
      SELECT GROUP_CONCAT(author_name, ' ')
      FROM (
        SELECT TRIM(COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, '')) AS author_name
        FROM authors_to_papers atp
        JOIN authors a ON a.author_id = atp.author_id
        WHERE atp.paper_id = p.paper_id
        ORDER BY atp.author_position
      )
    ),
    ''
  )
FROM papers p;
```

#### 1c. Sync Triggers (11 total)

| Trigger | Fires On | Action |
|---------|----------|--------|
| `papers_fts_paper_insert` | AFTER INSERT on `papers` | Insert new FTS row (empty keywords/authors; junction/base triggers fill/refresh) |
| `papers_fts_paper_update` | AFTER UPDATE on `papers` | Refresh the paper’s `title`/`abstract` + denormalized fields |
| `papers_fts_paper_delete` | AFTER DELETE on `papers` | Remove row from FTS table |
| `papers_fts_keyword_link_insert` | AFTER INSERT on `keywords_to_papers` | Recompute `keywords` for `NEW.paper_id` |
| `papers_fts_keyword_link_update` | AFTER UPDATE on `keywords_to_papers` | Recompute `keywords` for both `OLD.paper_id` and `NEW.paper_id` when they differ |
| `papers_fts_keyword_link_delete` | AFTER DELETE on `keywords_to_papers` | Recompute `keywords` for `OLD.paper_id` |
| `papers_fts_author_link_insert` | AFTER INSERT on `authors_to_papers` | Recompute `authors` for `NEW.paper_id` |
| `papers_fts_author_link_update` | AFTER UPDATE on `authors_to_papers` | Recompute `authors` for both `OLD.paper_id` and `NEW.paper_id` when they differ |
| `papers_fts_author_link_delete` | AFTER DELETE on `authors_to_papers` | Recompute `authors` for `OLD.paper_id` |
| `papers_fts_keyword_update` | AFTER UPDATE OF `keyword` on `keywords` | Recompute `keywords` for all linked papers |
| `papers_fts_author_name_update` | AFTER UPDATE OF `first_name`,`last_name` on `authors` | Recompute `authors` for all linked papers |

Note:
- Junction/base-table triggers should update only affected FTS columns (`keywords` or `authors`) where possible.
- Use the same ordered subqueries as initial population so index text is stable.

#### 1d. Update Migration Journal

Add an entry to `packages/db/migrations/meta/_journal.json` using:
- `idx`: current maximum + 1
- `tag`: migration file tag
- `version` and `breakpoints` fields matching existing entries

Do not hardcode an idx value in the plan.

---

### Step 2: Create Search Query Module

File: `packages/db/src/queries/search.ts`

#### Exports

```typescript
interface SearchResult {
  paperId: number;
  lingbuzzId: string;
  title: string;
  abstract: string | null;
  snippet: string;
  rank: number;
}

interface SearchOptions {
  query: string;
  limit?: number; // default 20, max 100
  offset?: number; // default 0
  field?: "all" | "title" | "abstract" | "keywords" | "authors";
}

class SearchSyntaxError extends Error {}

searchPapers(options: SearchOptions): Promise<SearchResult[]>
searchPapersCount(options: Pick<SearchOptions, "query" | "field">): Promise<number>
rebuildFtsIndex(): Promise<void>
```

#### Implementation Details

- Use `sql` tagged templates from `drizzle-orm` for raw FTS5 queries.
- Use `db.all(...)` / `db.get(...)` for read queries and `db.run(...)` for rebuild/maintenance statements.
- Build `MATCH` input without phrase-quoting so token/boolean FTS syntax remains available:
  - all-fields search: `matchQuery = query`
  - scoped search: `matchQuery = \`${field}:(${query})\``
- Bind `matchQuery`, `limit`, and `offset` as parameters (no string interpolation of user input into SQL).
- `snippet(papers_fts, 3, '<mark>', '</mark>', '...', 24)` on the abstract column.
- Order by `rank` ascending (best BM25 score first).
- Catch SQLite FTS parse errors and throw `SearchSyntaxError` for API layer handling.

#### `rebuildFtsIndex()` Utility

Manual full reindex sequence:
1. `DELETE FROM papers_fts`
2. `INSERT ... SELECT ...` (same statement used in initial population)
3. `INSERT INTO papers_fts(papers_fts) VALUES('optimize')`

---

### Step 3: Add DB Package Export and Scripts

File: `packages/db/package.json`

Add export:

```json
"./queries/search": "./src/queries/search.ts"
```

Add scripts:

```json
"rebuild:fts": "bun run scripts/rebuild-fts.ts"
```

Optional fallback script:

```json
"setup:fts": "bun run scripts/setup-fts5.ts"
```

---

### Step 4: Wire Up API Search Endpoint

File: `apps/api/src/routes/search.ts`

Replace the stub with:
- Import `searchPapers`, `searchPapersCount`, and `SearchSyntaxError` from `@lingbuzz/db/queries/search`.
- Parse `q` (required), `limit`, `offset`, `field`.
- Validate `field` against `["all", "title", "abstract", "keywords", "authors"]`.
- Normalize pagination:
  - `limit`: default `20`, clamp to `1..100`
  - `offset`: default `0`, clamp to `>= 0`
- Run `searchPapers` and `searchPapersCount` in parallel via `Promise.all`.
- Return:

```json
{
  "query": "syntax OR morphology",
  "field": "all",
  "total": 142,
  "limit": 20,
  "offset": 0,
  "data": [
    {
      "paperId": 123,
      "lingbuzzId": "007234",
      "title": "On the syntax of...",
      "abstract": "This paper argues...",
      "snippet": "...the <mark>syntax</mark> of relative clauses...",
      "rank": -4.23
    }
  ]
}
```

Error handling:
- `400` for missing `q`
- `400` for invalid `field`
- `400` for invalid FTS syntax (`SearchSyntaxError`)
- `500` for unexpected errors

No changes required in `apps/api/src/index.ts` because `/search` is already mounted.

---

### Step 5: Add Root Convenience Script

File: root `package.json`

Add:

```json
"db:rebuild-fts": "bun run --filter @lingbuzz/db rebuild:fts"
```

---

## Migration Fallback

If the migration runner cannot apply `CREATE VIRTUAL TABLE ... USING fts5(...)`:

1. Create `packages/db/scripts/setup-fts5.ts` to read the migration SQL file.
2. Split statements using Drizzle breakpoints (`--> statement-breakpoint`) and execute sequentially with `db.run(...)`.
3. Expose it as `setup:fts` in `packages/db/package.json`.
4. Run it manually after `bun run db:migrate`.

This fallback is for initial schema setup only, not routine reindexing.

---

## Design Decisions

### Why regular FTS5 table instead of external-content/contentless?

Data is denormalized across `papers`, `authors_to_papers`, and `keywords_to_papers`. A regular table keeps query logic straightforward and supports snippet/highlight behavior.

### Why DB triggers instead of application-level sync?

Trigger-based sync applies regardless of write path (scraper, admin scripts, future tools). This also covers authoritative edits to author names and keywords, not just relation inserts/deletes.

### Why keep raw FTS query syntax?

Users should be able to use token/boolean FTS syntax (`AND`, `OR`, quoted phrases, prefixes, parentheses). Forcing phrase quoting would reduce search expressiveness.

### Why `porter unicode61`?

Stemming improves recall across morphological variants; `unicode61` handles non-ASCII linguistic text.

---

## Verification Plan

1. Migration: run `bun run db:migrate` and confirm `papers_fts` exists.
2. Initial population: confirm `papers_fts` row count matches `papers` row count.
3. Insert sync: insert a paper and verify FTS row appears.
4. Author/keyword relation sync: add/remove links and verify `authors`/`keywords` FTS columns update.
5. Author/keyword authoritative updates: update `authors.first_name`/`last_name` and `keywords.keyword`, then verify FTS text updates for linked papers.
6. Search query behavior: validate token/boolean queries (`syntax OR morphology`, `title:phonology`, quoted phrases).
7. API behavior: validate happy-path response, `field` scoping, pagination, and `total` parity with count query.
8. API errors: verify `400` for missing `q`, invalid `field`, and invalid FTS syntax.
9. Lint/type checks: run `bun run check`, `bun run typecheck`, `bun --filter @lingbuzz/db typecheck`, and `bun --filter @lingbuzz/api typecheck`.
10. Regression tests:
   - Add DB-level tests for search results/count/trigger-driven sync.
   - Add API route tests for query parsing, validation, and response shape.
   - Run existing scraper test suite to ensure no regressions.
