# Agent Guidelines

## Commands
- **Run Scraper**: `bun run src/index.ts`
- **Alt Scraper**: `bun run src/getArticles.ts`
- **Lint/Format**: `bun biome check --write .` (No `npm` or `node`; use `bun`)
- **Test**: No test suite currently exists.

## Code Style & Conventions
- **Runtime**: Bun (strict requirement).
- **Formatting**: Biome defaults (Tabs, 90 char width, double quotes).
- **Imports**: Use ES modules (`import`/`export`).
- **Structure**: Functional components, separate utilities in `src/utils/`.
- **Types**: Strict TypeScript usage; define interfaces in `src/types.ts`.
- **Error Handling**: Handle HTML parsing failures gracefully; Lingbuzz HTML is fragile.
- **Naming**: camelCase for functions/variables, PascalCase for types/interfaces.
- **Data**: `papers.json` is the database; clean strings (no double quotes, ctrl chars).
