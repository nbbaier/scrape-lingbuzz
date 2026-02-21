# lingbuzz Monorepo Roadmap

## Project Vision

Transform lingbuzz (https://ling.auf.net/lingbuzz) from a static archive into a modern, searchable linguistics research platform with:
- Comprehensive database of linguistics papers with structured metadata
- API for programmatic access to paper data
- Modern web interface with advanced search, filtering, and citation tools
- Author and keyword relationships
- Paper version tracking and change detection

---

## Phases

### Phase 1: Monorepo Infrastructure ✅ DONE

**Status**: Completed (commit `e03a9ea`)

**Deliverables**:
- Bun monorepo with workspaces (`packages/*`, `apps/*`)
- `packages/db` (@lingbuzz/db) — Drizzle ORM + Turso database layer
  - 5-table schema (authors, papers, keywords, junction tables)
  - Query helpers (select/insert with conflict resolution)
  - Custom trigger system for timestamp management
  - 11 existing migrations from the slb project
- Root workspace scripts for DB management

**What's working**:
- `bun run db:generate` / `bun run db:migrate` — manage schema changes
- Root scraper still works unchanged at `src/index.ts`
- All DB functionality available via @lingbuzz/db

---

### Phase 2: Scraper Migration + API Scaffolding ✅ DONE

**Status**: Completed (commit `281b1f6`, branch `refactor/monorepo`)

**Scope**:
1. **Scraper migration** (`packages/scraper`) — combines two scrapers:
   - Foundation: scrape-lingbuzz's well-tested parsing logic
   - Enhancement: slb's author enrichment (email, affiliation, website)
   - Strategy: listing-page crawl with paper status detection (new/changed/date-only)
   - Persistence: direct to Turso DB via @lingbuzz/db
   - Concurrency: chunk-based processing with configurable limits

2. **API scaffolding** (`apps/api`) — Hono on Cloudflare Workers:
   - Papers endpoints: list, detail, recent
   - Authors endpoints: profile with papers
   - Search endpoint: placeholder (LIKE initially)
   - All routes consume @lingbuzz/db queries

3. **Test migration**: Migrate 54 existing tests from root `src/tests/`, adapt for new structure

4. **Root cleanup**: Keep `src/` untouched for now, remove in Phase 3 after parity verification

**Scraping strategy**:
Papers appear on lingbuzz listing with three states:
- **"new"** → first-time upload, always full scrape
- **"freshly changed"** → new PDF version, update version info
- **date only** (e.g. "2026-01") → existing paper, skip (or full scrape if new to DB)

**Key files**:
- See `PHASE2.md` for detailed file-by-file plan, source mappings, test migration strategy

**What's working**:
- `bun --filter @lingbuzz/scraper test` — 80 tests pass (8 files)
- `bun --filter @lingbuzz/scraper typecheck` — clean
- `bun run check` — biome passes on all new files
- `bun run api:dev` — Hono dev server starts

---

### Phase 3: Full-Text Search (FTS5) ✅ DONE

**Status**: Completed (commit `6a2e8a1`, branch `refactor/monorepo`)

**Deliverables completed**:
- Added FTS5 virtual table and sync triggers in DB migration
- Implemented typed search queries in `@lingbuzz/db`
- Wired API `/search` endpoint to FTS5 search and count
- Added field scoping (`all`, `title`, `abstract`, `keywords`, `authors`) with pagination and syntax error handling
- Added manual reindex scripts (`db:rebuild-fts`, `setup:fts`)

**What's working**:
- FTS5 migration exists at `packages/db/migrations/20260217103528_fts5_search.sql`
- Search query module at `packages/db/src/queries/search.ts`
- API route uses DB search queries at `apps/api/src/routes/search.ts`
- Root script `bun run db:rebuild-fts` is available for maintenance

---

### Phase 4: Semantic Search

**Status**: Not started

**Deliverables**:
- Evaluate embedding model (e.g., OpenAI, Hugging Face)
- Store embeddings in Turso (or separate vector DB)
- Implement semantic similarity search
- Integrate with API as `/search/semantic?q=...`

**Notes**:
- Lower priority than FTS5 (lexical search covers most use cases)
- Consider cost/latency trade-offs with Turso

---

### Phase 5: Frontend Integration

**Status**: Prototype exists (modern-lingbuzz), not integrated

**Deliverables**:
- Refine/rebuild Next.js frontend (in `apps/web`)
- Connect to `apps/api` endpoints
- Implement features:
  - Paper listing with pagination
  - Paper detail pages with author profiles
  - Search (both FTS5 and semantic)
  - Citation export (BibTeX, APA, Chicago, etc.)
  - Bookmark/favorite papers
  - Author pages with publication history
- Deploy to Vercel

**Design reference**: `/Users/nbbaier/Code/modern-lingbuzz/` (v0-generated scaffold with shadcn UI)

---

### Phase 6: Change Detection (Deep)

**Status**: Not started

**Deliverables**:
- Beyond "freshly changed" status from lingbuzz:
  - Detect abstract changes
  - Detect author list changes
  - Detect keyword/subject changes
  - Track revision history per paper
- Store in DB (paper_versions table with diffs)
- Surface in API and frontend

**Notes**:
- Requires comparing paper details across scrape runs
- Consider storing snapshot of previous version for diff computation

---

### Phase 7: Advanced Features (Future)

Potential future work (not scheduled):
- User accounts and reading lists
- Paper annotations/notes
- Notification system (new papers in watched keywords)
- Download metadata (track popular papers)
- Integration with other archives (arXiv, lingbuzz mirrors)
- Analytics (trending papers, author networks)
- Mobile app
- Citation network visualization

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser/Client                       │
└────────────────────────┬────────────────────────────────────┘
                         │
         ┌───────────────┴──────────────┐
         │                              │
    ┌────▼─────────────┐     ┌─────────▼────────┐
    │   apps/web       │     │ External APIs    │
    │  (Next.js/React) │     │ (Citation tools) │
    └────┬─────────────┘     └──────────────────┘
         │
         │ HTTPS
         │
    ┌────▼──────────────────────────────┐
    │    apps/api (Hono on CF Workers)  │
    │  ├─ /papers                       │
    │  ├─ /authors                      │
    │  └─ /search (FTS5 + semantic)     │
    └────┬──────────────────────────────┘
         │
         │ SQL (via @lingbuzz/db)
         │
    ┌────▼──────────────────────────────┐
    │   packages/db (@lingbuzz/db)      │
    │   (Drizzle ORM + Turso)           │
    │  ├─ schema/                       │
    │  ├─ queries/                      │
    │  └─ triggers/                     │
    └────┬──────────────────────────────┘
         │
         │ libSQL protocol
         │
    ┌────▼──────────────────────────────┐
    │  Turso (libSQL Cloud Database)    │
    │  ├─ authors                       │
    │  ├─ papers                        │
    │  ├─ keywords                      │
    │  ├─ authorsToPapers (junction)    │
    │  └─ keywordsToPapers (junction)   │
    └───────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Data Pipeline (Scraper)                   │
├─────────────────────────────────────────────────────────────┤
│  packages/scraper (@lingbuzz/scraper)                       │
│  ├─ listing.ts — fetch + parse lingbuzz listing pages       │
│  ├─ paper-parser.ts — parse paper detail pages              │
│  ├─ author-fetcher.ts — fetch author profiles               │
│  ├─ detect.ts — classify papers (new/changed/skip)          │
│  ├─ persist.ts — insert into @lingbuzz/db                   │
│  └─ index.ts — orchestration loop                           │
│                                                              │
│  Runs on: Bun (local/CI/VPS cron, or CF Worker Cron)        │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

1. **Bun runtime**: Chosen for fast startup and native TypeScript. Limits some deployment options (no CF Workers for scraper due to jsdom), but acceptable trade-off.

2. **Turso (libSQL)**: SQLite-based cloud DB. Cheaper than PostgreSQL, sufficient for this use case. Trade-off: no native vector DB support (Phase 4 will need workaround).

3. **Listing-page strategy**: Scraper crawls lingbuzz listing pages rather than guessing paper IDs. More reliable, captures paper status (new/changed), mirrors actual website UX.

4. **DB-first architecture**: All scraped data goes directly to Turso. No intermediate JSON files (unlike original scrape-lingbuzz). Enables real-time API access.

5. **Workspace structure**: `packages/` for reusable libraries, `apps/` for services. Allows scraper or API to be deployed/run independently.

---

## Known Constraints & Gotchas

### DB Connection in Workers
@lingbuzz/db creates connection eagerly from `process.env`. CF Workers use `Env` bindings. Phase 2 uses middleware workaround (set `process.env` from Worker bindings). Phase 4+ should refactor to factory pattern.

### jsdom + Workers
jsdom requires Node APIs, can't run in CF Workers. Scraper must run on Bun (VPS, cron, or separate Worker-incompatible environment).

### Unicode in Keywords
`split-keywords.ts` uses regex with special Unicode characters (U+F0D7 private-use area). File must be copied byte-for-byte; never rewrite via text editor.

### FTS5 Limitations
Turso's FTS5 support is good but not as featureful as PostgreSQL full-text search. Semantic search (Phase 4) will be critical for relevance beyond keyword matching.

---

## Success Metrics (Post-Phase 2)

- [x] Scraper runs incrementally and persists new papers to DB
- [x] API serves papers + authors + basic search
- [x] 80 migrated + new tests pass
- [x] Biome/ultracite linting passes
- [ ] Parity with original scraper (same papers extracted, same accuracy)
- [ ] Database grows with each scraper run
- [ ] Zero errors in production scrape runs

---

## Team/Context

**Owner**: nbbaier
**Tech Stack**: Bun, TypeScript, Drizzle ORM, Turso, Hono, Next.js, Cloudflare Workers
**Repositories**:
- scrape-lingbuzz (main monorepo, branch `refactor/monorepo`)
- slb (legacy, used as reference for DB schema and scraper enrichment)
- modern-lingbuzz (legacy, used as frontend reference)

---

## References

- Phase 1 Commit: `e03a9ea` (Bun monorepo + @lingbuzz/db)
- Phase 2 Plan: `docs/PHASE2.md` (detailed implementation guide)
- Phase 3 Plan: `docs/PHASE3.md` (FTS5 implementation guide)
- Phase 3 Commit: `6a2e8a1` (FTS5 search across DB and API)
- Original scrapers: `src/` (root), `/Users/nbbaier/Code/slb/src/`
- Frontend reference: `/Users/nbbaier/Code/modern-lingbuzz/`
