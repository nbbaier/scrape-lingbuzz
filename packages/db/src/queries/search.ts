import { sql } from "drizzle-orm";
import db from "..";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MIN_LIMIT = 1;
const DEFAULT_OFFSET = 0;

const FTS_SYNTAX_ERROR_PATTERNS = [
  "fts5: syntax error",
  "malformed match expression",
  "unterminated string",
  "unable to use function match",
  "no such column",
] as const;

const FTS_REBUILD_INSERT_SQL = sql`
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
  FROM papers p
`;

interface RawSearchResultRow {
  paper_id: number;
  lingbuzz_id: string;
  title: string;
  abstract: string | null;
  snippet: string;
  rank: number;
}

interface RawSearchCountRow {
  total: number;
}

export type SearchField = "all" | "title" | "abstract" | "keywords" | "authors";

export interface SearchResult {
  paperId: number;
  lingbuzzId: string;
  title: string;
  abstract: string | null;
  snippet: string;
  rank: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  field?: SearchField;
}

export class SearchSyntaxError extends Error {
  query: string;

  constructor(query: string, cause?: unknown) {
    super("Invalid full-text search syntax", { cause });
    this.name = "SearchSyntaxError";
    this.query = query;
  }
}

export async function searchPapers({
  query,
  limit = DEFAULT_LIMIT,
  offset = DEFAULT_OFFSET,
  field = "all",
}: SearchOptions): Promise<SearchResult[]> {
  const normalizedQuery = normalizeQuery(query);
  const matchQuery = buildMatchQuery(normalizedQuery, field);
  const normalizedLimit = clamp(limit, MIN_LIMIT, MAX_LIMIT);
  const normalizedOffset = Math.max(offset, DEFAULT_OFFSET);

  try {
    const result = await db.all<RawSearchResultRow>(sql`
      SELECT
        CAST(papers_fts.paper_id AS INTEGER) AS paper_id,
        papers_fts.lingbuzz_id AS lingbuzz_id,
        papers_fts.title AS title,
        NULLIF(papers_fts.abstract, '') AS abstract,
        snippet(papers_fts, 3, '<mark>', '</mark>', '...', 24) AS snippet,
        bm25(papers_fts) AS rank
      FROM papers_fts
      WHERE papers_fts MATCH ${matchQuery}
      ORDER BY rank ASC
      LIMIT ${normalizedLimit}
      OFFSET ${normalizedOffset}
    `);

    return result.map((row) => ({
      paperId: row.paper_id,
      lingbuzzId: row.lingbuzz_id,
      title: row.title,
      abstract: row.abstract,
      snippet: row.snippet,
      rank: row.rank,
    }));
  } catch (error: unknown) {
    throwSearchError(error, normalizedQuery);
  }
}

export async function searchPapersCount({
  query,
  field = "all",
}: Pick<SearchOptions, "query" | "field">): Promise<number> {
  const normalizedQuery = normalizeQuery(query);
  const matchQuery = buildMatchQuery(normalizedQuery, field);

  try {
    const result = await db.get<RawSearchCountRow>(sql`
      SELECT COUNT(*) AS total
      FROM papers_fts
      WHERE papers_fts MATCH ${matchQuery}
    `);

    return result?.total ?? 0;
  } catch (error: unknown) {
    throwSearchError(error, normalizedQuery);
  }
}

export async function rebuildFtsIndex(): Promise<void> {
  await db.run(sql`DELETE FROM papers_fts`);
  await db.run(FTS_REBUILD_INSERT_SQL);
  await db.run(sql`INSERT INTO papers_fts(papers_fts) VALUES('optimize')`);
}

function normalizeQuery(query: string): string {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    throw new SearchSyntaxError(query);
  }
  return normalizedQuery;
}

function buildMatchQuery(query: string, field: SearchField): string {
  if (field === "all") {
    return query;
  }

  return `${field}:(${query})`;
}

function isFtsSyntaxError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return FTS_SYNTAX_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern.toLowerCase())
  );
}

function throwSearchError(error: unknown, query: string): never {
  if (isFtsSyntaxError(error)) {
    throw new SearchSyntaxError(query, error);
  }

  throw error;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}
