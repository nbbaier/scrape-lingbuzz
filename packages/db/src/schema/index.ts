import { ne, or, sql } from "drizzle-orm";
import { index, primaryKey, sqliteTable } from "drizzle-orm/sqlite-core";
import { Trigger } from "../trigger";
import { rowTimestampColumns } from "./shared-cols";

export const authors = sqliteTable(
  "authors",
  (t) => ({
    authorId: t.integer().primaryKey(),
    firstName: t.text(),
    lastName: t.text(),
    username: t.text().unique().notNull(),
    email: t.text().notNull(),
    website: t.text(),
    affiliation: t.text(),
    //  ...recordTimestampColumns(t),
    ...rowTimestampColumns(t),
  }),
  (t) => [
    index("authors_names").on(t.lastName, t.firstName),
    index("authors_email").on(t.email),
  ]
);

export const updateAuthorsTimestampTrigger = new Trigger({
  name: "update_authors_timestamp",
  type: "UPDATE",
  timing: "AFTER",
  on: authors,
  do: (row) =>
    sql`UPDATE authors SET rows_updated_at = CURRENT_TIMESTAMP WHERE authorId = ${row.newRow.authorId}`,
  when: ({ newRow, oldRow }) => {
    const conditions = [
      ne(oldRow.firstName, newRow.firstName),
      ne(oldRow.lastName, newRow.lastName),
      ne(oldRow.username, newRow.username),
      ne(oldRow.email, newRow.email),
      ne(oldRow.website, newRow.website),
      ne(oldRow.affiliation, newRow.affiliation),
    ];
    return or(...conditions) ?? sql`1=1`;
  },
});

export const papers = sqliteTable(
  "papers",
  (t) => ({
    paperId: t.integer().primaryKey(),
    lingbuzzId: t.text().unique().notNull(),
    paperTitle: t.text().notNull(),
    publishedIn: t.text(),
    paperYear: t.text().notNull(),
    paperMonth: t.text().notNull(),
    keywordsRaw: t.text(),
    abstract: t.text(),
    paperReference: t.text().notNull(),
    downloads: t.integer(),
    downloadUrl: t.text(),
    paperUrl: t.text(),
    embeddedAt: t.integer({ mode: "timestamp" }),
    //  ...recordTimestampColumns(t),
    ...rowTimestampColumns(t),
  }),
  (t) => [
    index("papers_year").on(t.paperYear),
    index("papers_month").on(t.paperMonth),
    index("papers_date").on(t.paperYear, t.paperMonth),
  ]
);

export const keywords = sqliteTable("keywords", (t) => ({
  keywordId: t.integer().primaryKey(),
  keyword: t.text().unique().notNull(),
  ...rowTimestampColumns(t),
}));

export const authorsToPapers = sqliteTable(
  "authors_to_papers",
  (t) => ({
    authorId: t
      .integer()
      .notNull()
      .references(() => authors.authorId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    paperId: t
      .integer()
      .notNull()
      .references(() => papers.paperId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    authorPosition: t.integer().notNull(),
    ...rowTimestampColumns(t),
  }),
  (t) => [primaryKey({ columns: [t.authorId, t.paperId] })]
);

export const keywordsToPapers = sqliteTable(
  "keywords_to_papers",
  (t) => ({
    keywordId: t
      .integer()
      .notNull()
      .references(() => keywords.keywordId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    paperId: t
      .integer()
      .notNull()
      .references(() => papers.paperId, {
        onDelete: "cascade",
        onUpdate: "cascade",
      }),
    ...rowTimestampColumns(t),
  }),
  (t) => [primaryKey({ columns: [t.keywordId, t.paperId] })]
);

export type AuthorsTable = typeof authors;
export type PapersTable = typeof papers;
export type KeywordsTable = typeof keywords;
export type AuthorsToPapersTable = typeof authorsToPapers;
export type KeywordsToPapersTable = typeof keywordsToPapers;
export type DataTimeTable = AuthorsTable | PapersTable;
export type DatabaseTable =
  | DataTimeTable
  | KeywordsTable
  | AuthorsToPapersTable
  | KeywordsToPapersTable;
