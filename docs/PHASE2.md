# Phase 2: Scraper Migration + API Scaffolding

## Context

Phase 1 established the Bun monorepo with `packages/db` (@lingbuzz/db). Phase 2 migrates the scraper into `packages/scraper` and scaffolds the API at `apps/api`. The scraper combines the well-tested parsing from scrape-lingbuzz's root `src/` with the author enrichment and listing-page approach from the `slb` repo, persisting directly to Turso via @lingbuzz/db.

## Scope

- `packages/scraper/` — @lingbuzz/scraper, combines both scrapers, persists to DB
- `apps/api/` — @lingbuzz/api, Hono on CF Workers wrapping @lingbuzz/db
- Root `src/` stays untouched (removed in a future phase after verification)

---

## Part A: packages/scraper

### Scraping Strategy

Lingbuzz listing pages show papers in three states:
- **"new"** — first-time upload
- **"freshly changed"** — new PDF version
- **date only** (e.g. "2026-01") — everything else

Classification logic (in `detect.ts`):

| Status | In DB? | Action |
|--------|--------|--------|
| "new" | No | Full scrape |
| "new" | Yes | Skip |
| "freshly changed" | — | Update version (always) |
| date only | No | Full scrape |
| date only | Yes | Skip |

### File Structure

```
packages/scraper/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts            # Orchestration entry point
│   ├── listing.ts          # Listing page fetch + row parsing (from slb extractors)
│   ├── paper-parser.ts     # Paper detail page parsing (from root parsing.ts)
│   ├── author-fetcher.ts   # Author profile fetching (from slb fetchers)
│   ├── detect.ts           # Classify rows: full-scrape / update / skip
│   ├── persist.ts          # DB persistence via @lingbuzz/db
│   ├── types.ts            # Unified types
│   ├── schemas.ts          # Zod validation (adapted)
│   ├── constants.ts        # Config constants
│   ├── parsing-helpers.ts  # DOM utilities (from root)
│   ├── split-keywords.ts   # Keyword splitting (from root)
│   └── utils/
│       ├── retry.ts        # withRetry, fetchWithRetry (from root)
│       ├── logger.ts       # Structured logging (from root)
│       └── concurrency.ts  # mapWithConcurrency, chunkArray (from root utils.ts)
└── tests/
    ├── parsing-helpers.test.ts  # From root (update imports)
    ├── split-keywords.test.ts   # From root (update imports, add semicolon test)
    ├── paper-parser.test.ts     # From root parsing.test.ts (rename fields)
    ├── retry.test.ts            # From root (update imports)
    ├── logger.test.ts           # From root (update imports)
    ├── concurrency.test.ts      # From root utils.test.ts (update imports)
    ├── listing.test.ts          # NEW — mock HTML rows for all 3 statuses
    └── detect.test.ts           # NEW — mock DB queries
```

### File-by-File Plan

**A1. Package config**

`packages/scraper/package.json`:
- Name: `@lingbuzz/scraper`
- Dependencies: `@lingbuzz/db` (workspace:*), `jsdom`, `@types/jsdom`, `zod`
- Scripts: `start` (bun src/index.ts), `test` (vitest run), `typecheck`

`packages/scraper/tsconfig.json`: extends `../../tsconfig.base.json`

**A2. Pure utilities (migrate as-is from root src/)**

| Source | Destination | Changes |
|--------|-------------|---------|
| `src/utils/retry.ts` | `src/utils/retry.ts` | Import constants from local `../constants` |
| `src/utils/logger.ts` | `src/utils/logger.ts` | None |
| `src/utils/utils.ts` (just `mapWithConcurrency` + `chunkArray`) | `src/utils/concurrency.ts` | Extract only these 2 functions |
| `src/parsing-helpers.ts` | `src/parsing-helpers.ts` | None |
| `src/split-keywords.ts` | `src/split-keywords.ts` | Update split regex to also handle semicolons: `/[,;](?![^{[(<]*[\])}>])/` (from slb) |

**A3. `constants.ts`** — Merge root `src/constants.ts` + slb `src/config.ts`

- Keep: `BASE_URL` (standardize to no trailing slash), `CHUNK_SIZE`, `MAX_RETRIES`, `RETRY_BASE_DELAY_MS`, `PAPER_ID_LENGTH`
- Add: `LISTING_PAGE_SIZE = 100` (from slb)
- Remove: `PAPERS_FILE_PATH` (no more JSON file)

**A4. `types.ts`** — Unified types from both repos

```typescript
export type PaperStatus = "new" | "freshly changed" | string;

export interface ListingAuthor {
  firstName: string;
  lastName: string;
  authorUrl: string;
  username: string;
}

export interface EnrichedAuthor extends ListingAuthor {
  email: string;
  affiliation: string;
  website: string;
}

export interface ListingRow {
  paperId: string;
  title: string;
  status: PaperStatus;
  authors: Map<number, ListingAuthor>;  // position -> author
  downloadUrl: string;
  paperUrl: string;
}

export interface ParsedPaper {
  lingbuzzId: string;
  title: string;
  date: string;
  publishedIn: string;
  keywordsRaw: string;
  keywords: string[];
  abstract: string;
  downloads: number;
  downloadUrl: string;
  paperUrl: string;
}
```

**A5. `schemas.ts`** — Zod schema adapted for `ParsedPaper`

Replace old `PaperSchema` fields: `id` → `lingbuzzId`, `link` → `paperUrl`, drop `authors` (comes from listing row separately).

**A6. `listing.ts`** — From slb's `utils/extractors.ts` + `utils/common.ts`

Key functions:
- `generateListingUrls()` — paginated URL generation from paper count
- `fetchListingPage(url)` → `ListingRow[]` — fetch + parse all rows
- `parseListingRow(row: HTMLTableRowElement)` → `ListingRow | null` — extract status, authors (with usernames from `<a>` hrefs), paper ID, title, download URL

Source: slb's `extractDataFromRow()` already does this. Adapt to return `ListingRow` type, use `fetchWithRetry`, remove filesystem writing.

**A7. `paper-parser.ts`** — From root `src/parsing.ts`

- Rename `parsePaper()` → `parsePaperPage()`
- Return `ParsedPaper` instead of old `Paper` type
- Authors extracted here (from center element) are for validation/logging only — structured author data comes from the listing row
- All internal helpers (`normalizeText`, `extractRawAbstract`, `parseHeaderData`, etc.) migrate as-is

**A8. `author-fetcher.ts`** — From slb's `utils/fetchers.ts`

```typescript
export async function fetchAuthorProfile(authorUrl: string): Promise<{
  email: string;
  affiliation: string;
  website: string;
}>
```

Uses slb's CSS selector approach for the author profile page. Wraps with `fetchWithRetry`.

**A9. `detect.ts`** — New module

```typescript
export type ScrapeAction =
  | { action: "full-scrape"; row: ListingRow }
  | { action: "update-version"; row: ListingRow }
  | { action: "skip"; row: ListingRow; reason: string };

export async function classifyRows(rows: ListingRow[]): Promise<ScrapeAction[]>
```

Logic:
- "freshly changed" → always `update-version`
- "new" or date-only → query `selectPaperByLingbuzzId()`. Not found → `full-scrape`. Found → `skip`.

**A10. `persist.ts`** — New module, pattern from slb's `procedures/createPapers.ts`

```typescript
export async function persistPaper(
  paper: ParsedPaper,
  authors: Map<number, ListingAuthor>
): Promise<{ paperId: number }>

export async function persistAuthor(
  author: ListingAuthor,
  enriched?: { email: string; affiliation: string; website: string }
): Promise<{ authorId: number }>
```

`persistPaper` flow:
1. Split date into year/month
2. Insert paper via `insertPaper()` with returning paperId
3. For each keyword: upsert via `insertKeyword()`, get keywordId, link via `insertKeywordsPapers()`
4. For each author (by position): ensure author exists (check DB, fetch profile if needed), link via `insertAuthorsPapers()` with position

Uses: `insertPaper`, `insertAuthor`, `insertKeyword`, `insertAuthorsPapers`, `insertKeywordsPapers`, `buildConflictUpdateColumns`, `selectAuthorByUsername`, `selectKeywordId` — all from @lingbuzz/db.

**A11. `index.ts`** — Main orchestration

Flow:
1. Generate listing page URLs
2. For each page:
   - Fetch page → parse rows → `ListingRow[]`
   - Classify rows → `ScrapeAction[]`
   - Process actionable items with `mapWithConcurrency`:
     - **full-scrape**: fetch detail page → `parsePaperPage()` → ensure authors → `persistPaper()`
     - **update-version**: fetch detail page → update paper record (future: version-specific update)
3. **Incremental mode** (default): stop pagination when a page has zero actionable rows
4. **Full mode**: process all pages (when DB is empty or via CLI flag)
5. Print stats

### Test Migration

| Root test | Scraper test | Changes |
|-----------|-------------|---------|
| `parsing-helpers.test.ts` | `parsing-helpers.test.ts` | Update imports only |
| `split-keywords.test.ts` | `split-keywords.test.ts` | Update imports, add semicolon delimiter test |
| `parsing.test.ts` | `paper-parser.test.ts` | Rename fn + field assertions |
| `retry.test.ts` | `retry.test.ts` | Update imports only |
| `logger.test.ts` | `logger.test.ts` | Update imports only |
| `utils.test.ts` | `concurrency.test.ts` | Update imports only |
| `new-ids.test.ts` | **Skip** | Replaced by listing approach, write new `listing.test.ts` + `detect.test.ts` |

---

## Part B: apps/api

### File Structure

```
apps/api/
├── package.json
├── tsconfig.json
├── wrangler.toml
└── src/
    ├── index.ts
    └── routes/
        ├── papers.ts
        ├── authors.ts
        └── search.ts
```

**B1. Package config**

`apps/api/package.json`:
- Name: `@lingbuzz/api`
- Dependencies: `@lingbuzz/db` (workspace:*), `hono`
- DevDependencies: `@cloudflare/workers-types`, `wrangler`
- Scripts: `dev` (wrangler dev), `deploy` (wrangler deploy), `typecheck`

`wrangler.toml`: name `lingbuzz-api`, main `src/index.ts`. Turso credentials via `wrangler secret`.

**B2. DB connection in Workers**

@lingbuzz/db creates a connection eagerly from `process.env`. CF Workers use `Env` bindings, not `process.env`. Stopgap: Hono middleware sets `process.env` from Worker bindings before DB access. Proper factory pattern is a Phase 3 concern.

**B3. Routes**

`GET /papers` — paginated list (query: `?page=1&limit=20`)
`GET /papers/recent` — last N papers (declared before `:id` route)
`GET /papers/:id` — paper by lingbuzzId with authors + keywords
`GET /authors/:username` — author profile with papers
`GET /search?q=...` — placeholder (LIKE on title initially, FTS5 later)

All routes call @lingbuzz/db select functions directly.

---

## Part C: Root Updates

- Add to root `package.json` scripts: `"scrape": "bun --filter @lingbuzz/scraper start"`, `"api:dev": "bun --filter @lingbuzz/api dev"`
- Root `src/` stays untouched — removed in a future phase after scraper parity is verified

---

## Implementation Order

1. Scaffold `packages/scraper/` and `apps/api/` (package.json, tsconfig, wrangler)
2. `bun install` to link workspaces
3. Migrate pure utilities (logger, retry, concurrency, parsing-helpers, split-keywords, constants, types, schemas)
4. Migrate tests for pure utilities, verify they pass
5. Create `paper-parser.ts` + migrate `parsing.test.ts`
6. Create `listing.ts` + `author-fetcher.ts` + write `listing.test.ts`
7. Create `detect.ts` + `persist.ts` + write tests
8. Create `index.ts` orchestration
9. Scaffold API routes (can parallel with steps 5-8)
10. Update root package.json scripts
11. Run full verification

## Verification

1. `bun install` — workspace resolution for both new packages
2. `bun --filter @lingbuzz/scraper test` — all migrated + new tests pass
3. `bun --filter @lingbuzz/scraper typecheck` — clean
4. `bun run check` — biome passes on all new files
5. `bun run typecheck` — root scraper unaffected
6. `bun --filter @lingbuzz/api dev` — Hono dev server starts
7. Manual: run scraper against a small set of papers, verify DB persistence

## Key Source Files

- `src/parsing.ts` → foundation for `paper-parser.ts`
- `src/parsing-helpers.ts` → migrates as-is
- `src/split-keywords.ts` → migrates with semicolon regex addition
- `src/utils/retry.ts`, `src/utils/logger.ts` → migrate as-is
- `src/utils/utils.ts` → extract `mapWithConcurrency` + `chunkArray` only
- `/Users/nbbaier/Code/slb/src/utils/extractors.ts` → foundation for `listing.ts`
- `/Users/nbbaier/Code/slb/src/utils/fetchers.ts` → foundation for `author-fetcher.ts`
- `/Users/nbbaier/Code/slb/src/db/procedures/createPapers.ts` → pattern for `persist.ts`
- `packages/db/src/queries/insert.ts` → called by `persist.ts`
- `packages/db/src/queries/select.ts` → called by `detect.ts` and API routes
