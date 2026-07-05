# Vision & Decisions

Outcome of a design-grilling session (2026-07-04) that unified four repos
(`scrape-lingbuzz`, `slb`, `astro-lingbuzz`, `modern-lingbuzz`) into this
monorepo as the single project. See `CONTEXT.md` for the domain glossary and
`docs/adr/` for decisions with recorded trade-offs.

## What this is

A **public alternative frontend for LingBuzz** (ling.auf.net) — an unofficial
reading layer for the linguistics community. LingBuzz remains the archive of
record; we serve metadata only and every download link points back to
ling.auf.net (see ADR-0001).

**Not** (for now): a dataset/API product, a PDF mirror, an alerts service, or
a stats site. Alerts/feeds and trends/stats are consciously deferred, not
rejected.

## V1 core

1. **Search** — lexical (FTS5) + semantic (Workers AI + Vectorize), both
   already implemented in `apps/api`.
2. **Browse** — modern listing with filters, paper detail pages, real author
   profile pages.

### Freshness contract

Syncs run every few hours (not real-time — courtesy to the archive of record
is part of the ethos). The UI always shows "last synced N hours ago"; staleness
is a stated contract, not a bug.

## Architecture decisions

- **Vehicle**: this monorepo (`refactor/monorepo` branch), merged to `main`.
  Bun workspaces: `@lingbuzz/db`, `@lingbuzz/scraper`, `apps/api`, and a new
  `apps/web`. As part of v1's clean break from GitHub-Actions scraping, the
  GitHub repo is renamed `scrape-lingbuzz` → `project-lingbuzz` (GitHub
  redirects the old name). The repo name is internal identity only — the
  public product name remains TBD and distinct (see Identity below).
- **Frontend**: Astro on Cloudflare (CF adapter), deployed alongside the API.
  Whole stack lives on Cloudflare.
- **Design**: adopt the astro-lingbuzz editorial look (Source Serif display,
  IBM Plex body, warm off-white, orange accent) for v1.
  ⚠️ **Known debt**: that design was a one-shot prototype. Expect a larger
  design refactor after v1 — do not over-invest in polishing v1 pixels.
- **API posture**: frontend-first, quietly open. No docs, no versioning
  promises; not locked down either (rate limits + secured admin routes).
  Promoting it to a documented public API is a possible post-v1 move.
- **Database**: the existing Turso instance (`lingbuzz-nbbaier`) — shared
  history with `slb`, no divergence (verified 2026-07-04: both repos' `.env`
  point at the same URL).

## Scraper transition (three stages)

1. **Parallel parity**: new Bun scraper (`@lingbuzz/scraper` → Turso) runs on
   a GitHub Actions cron on the same schedule as the legacy `papers.json`
   cron. Both run for a week or two; parity is verified against live data.
2. **Legacy retirement**: delete the legacy workflow and flat `src/` scraper
   once the new pipeline demonstrably catches everything the old one does.
3. **End state — Workers-native**: replace jsdom with a Workers-compatible
   parser (linkedom / HTMLRewriter) and move scraping to a CF Cron Trigger,
   retiring the GH Actions job. The entire system then runs on Cloudflare.

## Legacy history

`main`'s ~1,100 "Latest data" commits (~115MB packed) are kept intact via a
regular merge — they are a longitudinal every-8-hours snapshot of archive
metadata **including download counts over time**, which the DB does not store.
This is the raw material for a future trends/stats feature. Tag the final
legacy commit (`legacy/json-scraper-final`); delete the ~25 orphaned bot
branches (`perf-*`, `jules-*`, `optimize-*`). If repo size ever becomes a real
problem, mine the snapshots into a DB table *before* any history pruning.

## Sibling repo wind-down

- **slb**: harvest its 183MB raw scrape corpus (`scraped_data/` — full HTML +
  JSON for 9,253 papers / 3,596 authors; useful for parser testing and
  backfill) into durable storage (R2 or local backup), then archive the
  GitHub repo.
- **modern-lingbuzz**: archive the GitHub repo **and spin down the Vercel
  deployment** (`v0-modern-ui-design` under nbbaiers-projects). Its
  interaction patterns (filter sidebar, list/card toggle, status badges)
  remain fair game to steal into apps/web.
- **astro-lingbuzz**: local-only (no GitHub repo). Port its design/components
  into `apps/web`, then it needs no formal archival.

## Identity & community posture

- Distinct name, **not** LingBuzz-derived (exact name TBD), with an explicit
  "unofficial reading layer for LingBuzz" tagline and prominent links back to
  ling.auf.net.
- Send Michal Starke a friendly heads-up **before** public launch.

## Definition of v1 shipped (full cutover)

- [ ] Astro frontend live on a real domain: browse, paper pages, author
      pages, lexical + semantic search, sync indicator
- [ ] New scraper on GH Actions cron; parity proven; legacy JSON cron and
      `src/` deleted
- [ ] `refactor/monorepo` merged to `main`; legacy tip tagged; bot branches
      deleted
- [ ] GitHub repo renamed `scrape-lingbuzz` → `project-lingbuzz` (clean break
      from the GitHub-Actions-scraper identity)
- [ ] slb raw corpus preserved; slb + modern-lingbuzz archived on GitHub
- [ ] modern-lingbuzz Vercel deployment spun down
- [ ] Heads-up email sent to Michal Starke
