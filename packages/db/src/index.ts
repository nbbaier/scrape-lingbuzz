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

export default drizzle({
  connection: {
    url: process.env.TURSO_DATABASE_URL as string,
    authToken: process.env.TURSO_AUTH_TOKEN as string,
  },
  casing: "snake_case",
  schema: {
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
  },
});
