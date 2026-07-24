import { eq, inArray, isNull } from "drizzle-orm";
import type { Db } from "../client";
import {
  type authors,
  authorsToPapers,
  keywords,
  keywordsToPapers,
  papers,
} from "../schema";
import { removeTimeColumns } from "./query-utils";

export type SelectPaper = typeof papers.$inferSelect;
export type SelectAuthor = typeof authors.$inferSelect;
export type SelectAuthorWithoutTime = Omit<
  typeof authors.$inferSelect,
  "rowCreatedAt" | "rowUpdatedAt" | "dataCreatedAt" | "dataUpdatedAt"
>;
export type SelectKeyword = typeof keywords.$inferSelect;

/// AUTHORS ///
export async function selectAuthors(
  db: Db,
  {
    limit,
  }: {
    limit?: number;
  } = {}
): Promise<SelectAuthor[]> {
  const result = await db.query.authors.findMany({
    limit,
  });
  return result;
}

export async function selectAuthorByUsername(db: Db, username: string) {
  const result = await db.query.authors.findFirst({
    where: (authors, { eq }) => eq(authors.username, username),
  });
  return result;
}

export async function selectAuthorByEmail(db: Db, email: string) {
  const result = await db.query.authors.findFirst({
    where: (authors, { eq }) => eq(authors.email, email),
  });
  return result;
}

/// KEYWORDS ///
export async function selectKeywords(
  db: Db,
  {
    limit,
  }: {
    limit?: number;
  } = {}
): Promise<SelectKeyword[]> {
  const result = await db.query.keywords.findMany({
    limit,
  });
  return result;
}

export async function selectKeywordId(db: Db, keyword: string) {
  const result = await db.query.keywords.findFirst({
    where: (keywords, { eq }) => eq(keywords.keyword, keyword),
  });
  return result?.keywordId;
}

/// PAPERS ///
export async function selectPapers(
  db: Db,
  { limit, offset }: { limit?: number; offset?: number } = {}
) {
  const result = await db.query.papers.findMany({
    with: {
      authorsToPapers: {
        columns: { authorPosition: true },
        with: {
          author: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      // keywordsToPapers: {
      // 	columns: {},
      // 	with: { keyword: { columns: { keyword: true } } },
      // },
    },
    limit,
    offset,
  });
  return result;
}

export async function selectPaperByLingbuzzId(db: Db, lingbuzzId: string) {
  const result = await db.query.papers.findFirst({
    where: (papers, { eq }) => eq(papers.lingbuzzId, lingbuzzId),
    with: {
      authorsToPapers: {
        columns: { authorPosition: true },
        with: {
          author: {
            columns: {
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      keywordsToPapers: {
        columns: {},
        with: { keyword: { columns: { keyword: true } } },
      },
    },
  });
  return result;
}

export async function selectPapersByAuthorId(
  db: Db,
  authorId: number,
  { limit }: { limit?: number } = {}
) {
  const coreQuery = db
    .select()
    .from(papers)
    .innerJoin(authorsToPapers, eq(papers.paperId, authorsToPapers.paperId))
    .where(eq(authorsToPapers.authorId, authorId));

  const result = limit ? await coreQuery.limit(limit) : await coreQuery;

  return result;
}
export async function selectPapersByKeyword(
  db: Db,
  keyword: string,
  { limit }: { limit?: number } = {}
) {
  const coreQuery = db
    .select({
      ...removeTimeColumns(papers),
    })
    .from(papers)
    .innerJoin(keywordsToPapers, eq(papers.paperId, keywordsToPapers.paperId))
    .innerJoin(keywords, eq(keywordsToPapers.keywordId, keywords.keywordId))
    .where(eq(keywords.keyword, keyword));

  const result = limit ? await coreQuery.limit(limit) : await coreQuery;

  return result;
}

/// UNEMBEDDED PAPERS ///
export async function selectUnembeddedPapers(
  db: Db,
  {
    limit,
  }: {
    limit?: number;
  } = {}
) {
  const result = await db
    .select({
      paperId: papers.paperId,
      lingbuzzId: papers.lingbuzzId,
      paperTitle: papers.paperTitle,
      abstract: papers.abstract,
    })
    .from(papers)
    .where(isNull(papers.embeddedAt))
    .limit(limit ?? 500);
  return result;
}

export async function markPapersEmbedded(db: Db, paperIds: number[]) {
  if (paperIds.length === 0) {
    return;
  }
  await db
    .update(papers)
    .set({ embeddedAt: new Date() })
    .where(inArray(papers.paperId, paperIds));
}
