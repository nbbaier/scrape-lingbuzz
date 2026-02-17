# Phase 3: Full-Text Search (FTS5) — Implementation Plan

## Context

Phase 2 is complete: the scraper persists papers to Turso and the API serves papers/authors, but the `/search` endpoint is a stub returning empty results. Phase 3 adds FTS5-based full-text search across paper titles, abstracts, keywords, and author names. This is the next critical step for making the platform useful — users need to find papers by content, not just browse.

## Architecture Overview

**Single denormalized FTS5 virtual table** (`papers_fts`) that combines data from `papers`, `keywords` (via junction), and `authors` (via junction) into one searchable index. Kept in sync via SQLite triggers.

**Why this design:**
- One FTS5 table = one `MATCH` query searches all fields at once
- Regular (not external-content) FTS5 table enables `snippet()` and `highlight()` for search UX
- `porter unicode61` tokenizer gives stemming ("morphological" → "morphology") + Unicode support — ideal for linguistics papers
- SQLite triggers handle sync automatically — no application code changes needed in the scraper's persist layer

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

- `paper_id` and `lingbuzz_id` are `UNINDEXED` — stored for joining back to `papers` but not searchable
- `title`, `abstract`, `keywords`, `authors` are the four searchable columns
- FTS5 column names are plain (not snake_case table columns) since this is a virtual table

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `packages/db/migrations/<ts>_fts5_search.sql` | **Create** | FTS5 table + initial population + 8 sync triggers |
| `packages/db/migrations/meta/_journal.json` | **Modify** | Add entry (idx 31) for new migration |
| `packages/db/src/queries/search.ts` | **Create** | `searchPapers`, `searchPapersCount`, `rebuildFtsIndex` |
| `packages/db/package.json` | **Modify** | Add `"./queries/search"` export |
| `apps/api/src/routes/search.ts` | **Modify** | Replace stub with FTS5-backed implementation |
| `packages/db/scripts/setup-fts5.ts` | **Create** (fallback) | Only if drizzle-kit can't run FTS5 SQL |

---

## Step-by-Step Implementation

### Step 1: Create FTS5 Migration

**File:** `packages/db/migrations/<timestamp>_fts5_search.sql`

#### 1a. Virtual Table Creation

See schema above.

#### 1b. Initial Population

Denormalize existing data into the FTS table:

```sql
INSERT INTO papers_fts (paper_id, lingbuzz_id, title, abstract, keywords, authors)
SELECT
  p.paper_id,
  p.lingbuzz_id,
  p.paper_title,
  COALESCE(p.abstract, ''),
  COALESCE(
    (SELECT GROUP_CONCAT(k.keyword, ' ')
     FROM keywords_to_papers ktp
     JOIN keywords k ON k.keyword_id = ktp.keyword_id
     WHERE ktp.paper_id = p.paper_id),
    ''
  ),
  COALESCE(
    (SELECT GROUP_CONCAT(
       COALESCE(a.first_name, '') || ' ' || COALESCE(a.last_name, ''), ' ')
     FROM authors_to_papers atp
     JOIN authors a ON a.author_id = atp.author_id
     WHERE atp.paper_id = p.paper_id),
    ''
  )
FROM papers p;
```

#### 1c. Sync Triggers (8 total)

| Trigger | Fires On | Action |
|---------|----------|--------|
| `papers_fts_insert` | AFTER INSERT on `papers` | Insert new FTS row (keywords/authors empty, filled by junction triggers) |
| `papers_fts_update` | AFTER UPDATE on `papers` | DELETE old + INSERT new with full subqueries |
| `papers_fts_delete` | AFTER DELETE on `papers` | Delete from FTS |
| `papers_fts_keyword_insert` | AFTER INSERT on `keywords_to_papers` | UPDATE FTS `keywords` column via subquery |
| `papers_fts_keyword_delete` | AFTER DELETE on `keywords_to_papers` | UPDATE FTS `keywords` column via subquery |
| `papers_fts_author_insert` | AFTER INSERT on `authors_to_papers` | UPDATE FTS `authors` column via subquery |
| `papers_fts_author_delete` | AFTER DELETE on `authors_to_papers` | UPDATE FTS `authors` column via subquery |

**Note:** FTS5 supports column-specific UPDATE (`UPDATE papers_fts SET keywords = ... WHERE paper_id = ?`), so junction triggers only recompute the affected column — not the entire row.

#### 1d. Update Migration Journal

Add entry to `packages/db/migrations/meta/_journal.json` at idx 31, following existing pattern.

---

### Step 2: Create Search Query Module

**File:** `packages/db/src/queries/search.ts`

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
  limit?: number;   // default 20, max 100
  offset?: number;  // default 0
  field?: "title" | "abstract" | "keywords" | "authors";
}

searchPapers(options: SearchOptions): Promise<SearchResult[]>
searchPapersCount(options: Pick<SearchOptions, "query" | "field">): Promise<number>
rebuildFtsIndex(): Promise<void>
```

#### Implementation Details

- Uses `sql` tagged template from `drizzle-orm` for raw FTS5 queries
- Executes via `db.run(sql`...`)` — returns a `ResultSet` with `.rows`
- Maps rows to typed `SearchResult` objects
- `snippet()` called on the abstract column (index 3) with `<mark>`/`</mark>` delimiters
- Results ordered by FTS5 `rank` (BM25 relevance scoring, built into FTS5)
- Field-scoped search uses FTS5 column filter syntax: e.g., `{title}:query`
- Input sanitization: double-quote user input to treat as phrase match, escape internal quotes

#### `rebuildFtsIndex()` Utility

For manual full reindex:
1. `DELETE FROM papers_fts`
2. `INSERT...SELECT` (same as initial population)
3. `INSERT INTO papers_fts(papers_fts) VALUES('optimize')` — FTS5 optimization command

---

### Step 3: Add Package Export

**File:** `packages/db/package.json`

Add to `"exports"`:
```json
"./queries/search": "./src/queries/search.ts"
```

---

### Step 4: Wire Up API Search Endpoint

**File:** `apps/api/src/routes/search.ts`

Replace the current stub with:
- Import `searchPapers` and `searchPapersCount` from `@lingbuzz/db/queries/search`
- Parse query params: `q` (required), `limit`, `offset`, `field`
- Validate `field` against allowed values
- Run `searchPapers` and `searchPapersCount` in parallel via `Promise.all`
- Return JSON response:

```json
{
  "query": "syntax",
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

- Error responses: 400 for missing `q` or invalid `field`
- No changes needed to `apps/api/src/index.ts` — route already mounted at `/search`

---

### Step 5: Add Convenience Script

**File:** root `package.json`

Add script for manual reindexing:
```json
"db:rebuild-fts": "bun run --filter @lingbuzz/db scripts/setup-fts5.ts"
```

---

## Migration Fallback

drizzle-kit may fail to parse `CREATE VIRTUAL TABLE` syntax. If so:

1. Create `packages/db/scripts/setup-fts5.ts` that reads the SQL file and executes it via `db.run()`
2. Add `"setup:fts": "bun run scripts/setup-fts5.ts"` to `packages/db/package.json` scripts
3. Run manually after `bun run db:migrate`

---

## Design Decisions

### Why a regular FTS5 table (not external content)?
Data spans 3 tables with junctions, making `content=papers` impractical. A contentless table (`content=''`) can't use `snippet()` or `highlight()`. The dataset isn't huge — duplicating title+abstract+keywords+authors is a small cost for much simpler queries and full snippet support.

### Why triggers (not application-level sync)?
The scraper already uses `insertPaper`, `insertAuthor`, `insertKeyword`, and junction insert functions. Triggers fire automatically regardless of where the INSERT comes from — no changes needed to the scraper's persist layer. The existing `Trigger` class in `packages/db/src/trigger.ts` handles single-table cases; FTS5 triggers need cross-table subqueries, so raw SQL in the migration is more pragmatic.

### Why `porter unicode61` tokenizer?
Porter stemming maps morphological variants to a common stem (critical for linguistics search where "morphological"/"morphology"/"morphologies" should all match). `unicode61` handles diacritics and non-ASCII characters common in linguistics terminology.

---

## Verification Plan

1. **Migration**: Run `bun run db:migrate` — confirm FTS5 table exists via `SELECT * FROM papers_fts LIMIT 1`
2. **Trigger sync**: Insert a test paper via scraper — confirm it appears in `papers_fts`
3. **Search queries**: Run search functions directly — confirm results with snippets and ranking
4. **API endpoint**: `curl "http://localhost:8787/search?q=syntax"` — confirm JSON response with results
5. **Field scoping**: `curl "http://localhost:8787/search?q=chomsky&field=authors"` — confirm author-only matches
6. **Pagination**: `curl "http://localhost:8787/search?q=phonology&limit=5&offset=5"` — confirm offset works
7. **Biome**: `bun run check` — all new files pass linting
8. **Typecheck**: `bun --filter @lingbuzz/db typecheck` — clean
9. **Existing tests**: `bun --filter @lingbuzz/scraper test` — 80 tests still pass (no regressions)
