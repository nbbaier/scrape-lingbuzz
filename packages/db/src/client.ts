import { drizzle } from "drizzle-orm/libsql";
import {
  authors,
  authorsToPapers,
  keywords,
  keywordsToPapers,
  papers,
  updateAuthorsTimestampTrigger,
} from "./schema";
import {
  authorsRelations,
  authorsToPapersRelations,
  keywordsRelations,
  keywordsToPapersRelations,
  papersRelations,
} from "./schema/relations";

const schema = {
  authors,
  authorsToPapers,
  keywords,
  keywordsToPapers,
  papers,
  updateAuthorsTimestampTrigger,
  authorsRelations,
  authorsToPapersRelations,
  keywordsRelations,
  keywordsToPapersRelations,
  papersRelations,
};

export interface DbConfig {
  url: string;
  authToken?: string;
}

export function createDb(config: DbConfig) {
  return drizzle({
    connection: config,
    casing: "snake_case",
    schema,
  });
}

export type Db = ReturnType<typeof createDb>;
