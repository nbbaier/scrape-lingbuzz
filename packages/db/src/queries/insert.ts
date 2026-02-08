import type { ResultSet } from "@libsql/client";
import { getTableColumns, type SQL, sql } from "drizzle-orm";
import type {
  IndexColumn,
  SQLiteColumn,
  SQLiteTable,
  SQLiteUpdateSetSource,
} from "drizzle-orm/sqlite-core";
import { snakeCase } from "text-snake-case";
import db from "..";
import {
  authors,
  authorsToPapers,
  type DatabaseTable,
  keywords,
  keywordsToPapers,
  papers,
} from "../schema/";

export const buildConflictUpdateColumns = <
  T extends SQLiteTable,
  Q extends keyof T["_"]["columns"],
>(
  table: T,
  columns: Q[]
) => {
  const cls = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = snakeCase(cls[column].name);
      acc[column] = sql.raw(`excluded.${colName}`);
      return acc;
    },
    {} as Record<Q, SQL>
  );
};

type Paper = typeof papers.$inferSelect;
type Author = typeof authors.$inferSelect;
type Keyword = typeof keywords.$inferSelect;
type AuthorPaper = typeof authorsToPapers.$inferSelect;
type KeywordPaper = typeof keywordsToPapers.$inferSelect;

export type InsertPaper = typeof papers.$inferInsert;
export type InsertAuthor = typeof authors.$inferInsert;
export type InsertKeyword = typeof keywords.$inferInsert;
export type InsertAuthorsPaper = typeof authorsToPapers.$inferInsert;
export type InsertKeywordsPaper = typeof keywordsToPapers.$inferInsert;

export interface InsertOptions<
  TTable extends DatabaseTable,
  TReturning = undefined,
> {
  returning?: TReturning;
  onConflictDo?: { target: IndexColumn | IndexColumn[] };
  onConflictDoUpdate?: {
    target: IndexColumn | IndexColumn[];
    targetWhere?: SQL;
    setWhere?: SQL;
    set: SQLiteUpdateSetSource<TTable>;
  };
}

type InsertIntoTableReturnType<T, TableSelect> =
  T extends Record<string, SQLiteColumn>
    ? { [K in keyof T & keyof TableSelect]: TableSelect[K] }[]
    : ResultSet;

async function insertIntoTable<
  TTable extends DatabaseTable,
  TableSelect,
  TableInsert extends TTable["$inferInsert"],
  T extends
    | Partial<Record<keyof TableSelect, SQLiteColumn>>
    | undefined = undefined,
>(
  table: TTable,
  data: TableInsert,
  {
    returning,
    onConflictDo,
    onConflictDoUpdate,
  }: InsertOptions<TTable, NonNullable<T>> = {}
): Promise<InsertIntoTableReturnType<T, TableSelect>> {
  if (onConflictDo && returning) {
    throw new Error("Cannot use both returning and onConflictDo");
  }

  const coreStatement = db.insert(table).values(data);
  let result: InsertIntoTableReturnType<T, TableSelect>;

  if (onConflictDo) {
    result = (await coreStatement.onConflictDoNothing(
      onConflictDo
    )) as InsertIntoTableReturnType<T, TableSelect>;
  } else if (onConflictDoUpdate && returning) {
    const definedColumns = Object.values(returning).filter(
      (col): col is SQLiteColumn => col !== undefined
    );
    result = (await coreStatement
      .onConflictDoUpdate(onConflictDoUpdate)
      .returning(
        Object.fromEntries(definedColumns.map((col) => [col.name, col]))
      )) as InsertIntoTableReturnType<T, TableSelect>;
  } else if (onConflictDoUpdate) {
    result = (await coreStatement.onConflictDoUpdate(
      onConflictDoUpdate
    )) as InsertIntoTableReturnType<T, TableSelect>;
  } else if (returning) {
    const definedColumns = Object.values(returning).filter(
      (col): col is SQLiteColumn => col !== undefined
    );
    result = (await coreStatement.returning(
      Object.fromEntries(definedColumns.map((col) => [col.name, col]))
    )) as InsertIntoTableReturnType<T, TableSelect>;
  } else {
    result = (await coreStatement) as InsertIntoTableReturnType<T, TableSelect>;
  }
  return result;
}

export function insertPaper<
  T extends Partial<Record<keyof Paper, SQLiteColumn>> | undefined = undefined,
>(
  paper: InsertPaper,
  options?: InsertOptions<typeof papers, T>
): Promise<InsertIntoTableReturnType<T, Paper>> {
  return insertIntoTable<typeof papers, Paper, InsertPaper, T>(
    papers,
    paper,
    options
  );
}

export function insertAuthor<
  T extends Partial<Record<keyof Author, SQLiteColumn>> | undefined = undefined,
>(author: InsertAuthor, options?: InsertOptions<typeof authors, T>) {
  return insertIntoTable<typeof authors, Author, InsertAuthor, T>(
    authors,
    author,
    options
  );
}

export function insertKeyword<
  T extends
    | Partial<Record<keyof Keyword, SQLiteColumn>>
    | undefined = undefined,
>(keyword: InsertKeyword, options?: InsertOptions<typeof keywords, T>) {
  return insertIntoTable<typeof keywords, Keyword, InsertKeyword, T>(
    keywords,
    keyword,
    options
  );
}

export function insertAuthorsPapers<
  T extends
    | Partial<Record<keyof AuthorPaper, SQLiteColumn>>
    | undefined = undefined,
>(
  authorsPaper: InsertAuthorsPaper,
  options?: InsertOptions<typeof authorsToPapers, T>
) {
  return insertIntoTable<
    typeof authorsToPapers,
    AuthorPaper,
    InsertAuthorsPaper,
    T
  >(authorsToPapers, authorsPaper, options);
}

export function insertKeywordsPapers<
  T extends
    | Partial<Record<keyof KeywordPaper, SQLiteColumn>>
    | undefined = undefined,
>(
  keywordsPaper: InsertKeywordsPaper,
  options?: InsertOptions<typeof keywordsToPapers, T>
) {
  return insertIntoTable<
    typeof keywordsToPapers,
    KeywordPaper,
    InsertKeywordsPaper,
    T
  >(keywordsToPapers, keywordsPaper, options);
}
