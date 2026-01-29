# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an automated web scraper for the lingbuzz linguistics paper archive (https://ling.auf.net/lingbuzz). It runs on a GitHub Actions schedule (every 8 hours) to scrape new paper metadata and store it in `papers.json`.

## Runtime

This project uses **Bun** as the JavaScript runtime, not Node.js. All commands must be run with `bun`:

```bash
bun run src/index.ts
```

## Common Commands

### Running the scraper

```bash
# Main scraper (default entry point)
bun run src/index.ts

# Alternative entry point for article listing
bun run src/getArticles.ts
```

### Code quality

```bash
# Format code
bun biome format --write .

# Lint code
bun biome lint .

# Check formatting and linting
bun biome check .

# Fix auto-fixable issues
bun biome check --write .
```

## Code Architecture

### Scraping Flow

The scraper operates in two modes:

1. **Initial scrape** (when `papers.json` is empty):
   - Determines the newest paper ID from the front page
   - Scrapes all papers from ID 2 to the newest ID

2. **Incremental scrape** (default):
   - Compares front page IDs against existing `papers.json`
   - Only scrapes new papers not yet in the database

### Key Components

**Entry point** (`src/index.ts`):

- Loads existing papers from `papers.json`
- Calls `newIds()` to detect new papers on the front page
- Scrapes papers in chunks of 5 concurrently
- Merges new papers with existing data and writes to `papers.json`

**ID detection** (`src/newIds.ts`):

- `getFrontPageIds()`: Scrapes the front page table to extract all visible paper IDs
- `newestId()`: Returns the highest ID from the front page
- `newIds()`: Compares front page IDs with existing papers to find new ones

**HTML parsing** (`src/parsingHelpers.ts`):

- `parseCenterElement()`: Extracts title, authors, and date from the `<center>` element
- `parseTable()`: Parses the metadata table into a key-value map
- `parseAbstract()`: Cleans abstract text by normalizing quotes and whitespace

**Data utilities** (`src/utils/utils.ts`):

- `getPaperHtml()`: Fetches HTML for a specific paper ID
- `loadPapers()`: Loads existing papers.json (creates empty file if missing)
- `updatePapers()`: Merges new papers into existing data without duplicates
- `chunkArray()`: Splits array into chunks for concurrent processing

### Data Models

**Paper type** (`src/types.ts`):

```typescript
{
  id: string;          // 6-digit padded ID (e.g., "007234")
  title: string;
  authors: string[];   // Array of author names
  date: string;
  published_in: string;
  keywords: string[];
  keywords_raw: string;
  abstract: string;
  link: string;        // Full URL to paper
  downloads: number;
}
```

**Article type** (`src/types.ts`):
Used by the alternative scraper in `src/getArticles.ts` for listing view parsing.

### HTML Parsing Strategy

The lingbuzz website has fragile HTML structure that relies on:

- Table index positions (e.g., `querySelectorAll("table")[2]`)
- DOM node indexing (e.g., `childNodes[5]`)
- Specific selector paths (e.g., `body > center`, `body > table`)

When the scraper fails, these hardcoded selectors are the first place to check.

### Data Cleaning

Paper metadata undergoes several transformations:

- Double quotes → single quotes (for JSON compatibility)
- Control characters stripped (regex: `/[\u0000-\u001F\u007F-\u009F]/g`)
- Multiple spaces collapsed to single space
- Keywords split by commas (but ignoring commas inside brackets/parens)

### GitHub Actions Integration

The workflow (`.github/workflows/scrape.yml`):

1. Runs every 8 hours (cron: `0 */8 * * *`)
2. Executes `bun run src/index.ts`
3. Formats `papers.json` using `jq`
4. Commits changes with timestamp if data changed

## Code Style

- **Formatter**: Biome with tabs, 90 character line width, double quotes
- **Linting**: Biome recommended rules
- Papers.json is excluded from Biome checks
