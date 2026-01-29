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

**ID detection** (`src/new-ids.ts`):

- `getFrontPageIds()`: Scrapes the front page table to extract all visible paper IDs
- `newestId()`: Returns the highest ID from the front page
- `newIds()`: Compares front page IDs with existing papers to find new ones

**HTML parsing** (`src/parsing-helpers.ts`):

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
Used by the alternative scraper in `src/get-articles.ts` for listing view parsing.

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
,cla


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

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

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

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

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

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
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `bun x ultracite fix` before committing to ensure compliance.
