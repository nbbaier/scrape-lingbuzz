# Agent Guidelines

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
bun run src/get-articles.ts
```

### Code quality

```bash
# Check formatting and linting
bun run check

# Fix auto-fixable issues
bun run fix

# Type check
bun run typecheck
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
- Scrapes papers in chunks of 5 concurrently using `mapWithConcurrency()`
- Merges new papers with existing data, strips control characters, and writes to `papers.json`

**ID detection** (`src/new-ids.ts`):

- `getFrontPageIds()`: Scrapes the front page table to extract all visible paper IDs
- `newestId()`: Returns the highest ID from the front page
- `newIds()`: Compares front page IDs with existing papers to find new ones

**Main Parsing Logic** (`src/parsing.ts`):

- `parsePaper()`: Orchestrates the parsing of a single paper's HTML
- `normalizeText()`: Strips control characters and converts double quotes to single quotes
- `extractRawAbstract()`: Extracts the abstract text from specific DOM nodes

**HTML parsing helpers** (`src/parsing-helpers.ts`):

- `parseCenterElement()`: Extracts title, authors, and date from the `<center>` element
- `parseTable()`: Parses the metadata table into a key-value map
- `parseAbstract()`: Cleans abstract text by normalizing whitespace

**Validation & Types** (`src/schemas.ts` and `src/types.ts`):

- `PaperSchema`: Zod schema for validating paper metadata
- `ArticleSchema`: Zod schema for article listing data
- Both files define TypeScript types inferred from or corresponding to these schemas

**Keyword Processing** (`src/split-keywords.ts`):

- `splitKeywords()`: Splits keyword strings by commas (respecting brackets) and other delimiters

**Data utilities** (`src/utils/`):

- `getPaperHtml()` (`utils.ts`): Fetches HTML for a specific paper ID
- `loadPapers()` (`utils.ts`): Loads existing papers.json (creates empty file if missing)
- `updatePapers()` (`utils.ts`): Merges new papers into existing data without duplicates
- `mapWithConcurrency()` (`utils.ts`): Generic utility for concurrent execution in chunks
- `logger` (`logger.ts`): Winston-based logger for consistent output
- `withRetry()` (`retry.ts`): Wrapper for retrying failed operations with exponential backoff

### Data Models

**Paper type** (from `src/schemas.ts`):

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

**Article type** (from `src/schemas.ts`):
Used by the alternative scraper in `src/get-articles.ts` for listing view parsing.

### HTML Parsing Strategy

The lingbuzz website has fragile HTML structure that relies on:

- Table index positions (e.g., `querySelectorAll("table")[2]`)
- DOM node indexing (e.g., `childNodes[5]` for the abstract)
- Specific selector paths (e.g., `body > center`, `body > table`)

When the scraper fails, these hardcoded selectors in `src/parsing.ts` and `src/parsing-helpers.ts` are the first place to check.

### Data Cleaning

Paper metadata undergoes several transformations:

- Double quotes → single quotes (for JSON compatibility)
- Control characters stripped (custom `stripControlChars` and regex)
- Multiple spaces collapsed to single space
- Keywords split by commas (but ignoring commas inside brackets/parens) and other delimiters (·, -, –, , /)

### GitHub Actions Integration

The workflow (`.github/workflows/scrape.yml`):

1. Runs every 8 hours (cron: `0 */8 * * *`)
2. Executes `bun run src/index.ts`
3. Formats `papers.json` using `jq`
4. Commits changes with timestamp if data changed

---

# Stacked PR Workflow

This refactor is implemented as a series of stacked PRs. Each phase builds on the previous one.

## Branch Structure

| Phase | Branch | PR Target |
|-------|--------|-----------|
| Phase 1 | `refactor/monorepo` | `main` |
| Phase 2 | `refactor/phase-2` | `refactor/monorepo` |
| Phase 3+ | `refactor/phase-N` | `refactor/phase-(N-1)` |

## Rules

1. **Create new phase branches from the tip of the previous phase branch:**
   ```bash
   git checkout -b refactor/phase-N refactor/phase-(N-1)
   ```

2. **Each PR targets the branch below it**, not `main` (except Phase 1 which targets `main`).

3. **If the base branch is updated**, rebase onto it:
   ```bash
   git rebase refactor/phase-(N-1)
   ```

4. **When a phase merges into `main`**, retarget the next phase's PR to `main`.

---

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting via Biome.

## Quick Reference

- **Format code**: `bun run fix`
- **Check for issues**: `bun run check`
- **Type check**: `bun run typecheck`

## Core Principles

Write code that is **performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Validate and sanitize user input
- Avoid `eval()` or dangerous string-to-code executions

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **Documentation** - Add comments for complex logic, but prefer self-documenting code
