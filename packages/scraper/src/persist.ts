import {
  buildConflictUpdateColumns,
  type InsertAuthor,
  type InsertAuthorsPaper,
  type InsertKeywordsPaper,
  type InsertPaper,
  insertAuthor,
  insertAuthorsPapers,
  insertKeyword,
  insertKeywordsPapers,
  insertPaper,
} from "@lingbuzz/db/queries/insert";
import {
  selectAuthorByUsername,
  selectKeywordId,
} from "@lingbuzz/db/queries/select";
import { authors, keywords, papers } from "@lingbuzz/db/schema";
import { fetchAuthorProfile } from "./author-fetcher";
import type { ListingAuthor, ParsedPaper } from "./types";
import { logger } from "./utils/logger";

/**
 * Persists a parsed paper and its keyword/author relations to the database.
 */
export async function persistPaper(
  paper: ParsedPaper,
  authorMap: Map<number, ListingAuthor>
): Promise<{ paperId: number }> {
  const [month = "", year = ""] = paper.date.split(" ");

  const newPaper: InsertPaper = {
    lingbuzzId: paper.lingbuzzId,
    paperTitle: paper.title,
    paperYear: year,
    paperMonth: month,
    publishedIn: paper.publishedIn,
    keywordsRaw: paper.keywordsRaw,
    paperReference: `lingbuzz/${paper.lingbuzzId}`,
    abstract: paper.abstract,
    downloads: paper.downloads,
    downloadUrl: paper.downloadUrl,
    paperUrl: paper.paperUrl,
  };

  const paperResult = await insertPaper(newPaper, {
    returning: { paperId: papers.paperId },
  });

  const paperId = (paperResult as { paperId: number }[])[0].paperId;

  // Insert keywords
  for (const keyword of new Set(paper.keywords)) {
    if (!keyword) {
      continue;
    }
    await insertKeyword(
      { keyword },
      { onConflictDo: { target: keywords.keyword } }
    );
    const keywordId = await selectKeywordId(keyword);
    if (!keywordId) {
      logger.warn(`No keywordId found for keyword: ${keyword}`);
      continue;
    }

    const mapping: InsertKeywordsPaper = { keywordId, paperId };
    try {
      await insertKeywordsPapers(mapping);
    } catch (error) {
      logger.error(
        `Failed to insert keyword-paper relation for keywordId: ${keywordId}, paperId: ${paperId}`,
        error
      );
    }
  }

  // Insert author-paper relations
  for (const [position, authorData] of authorMap) {
    const authorId = await ensureAuthor(authorData);
    if (!authorId) {
      continue;
    }

    const mapping: InsertAuthorsPaper = {
      authorId,
      paperId,
      authorPosition: position,
    };
    try {
      await insertAuthorsPapers(mapping);
    } catch (error) {
      logger.error(
        `Failed to insert author-paper relation for authorId: ${authorId}, paperId: ${paperId}`,
        error
      );
    }
  }

  return { paperId };
}

/**
 * Ensures an author exists in the database. Creates them if not found,
 * fetching their profile for enrichment data.
 */
async function ensureAuthor(author: ListingAuthor): Promise<number | null> {
  const existing = await selectAuthorByUsername(author.username);
  if (existing) {
    return existing.authorId;
  }

  let email = "";
  let affiliation = "";
  let website = "";

  if (author.authorUrl) {
    try {
      const profile = await fetchAuthorProfile(author.authorUrl);
      email = profile.email;
      affiliation = profile.affiliation;
      website = profile.website;
    } catch (error) {
      logger.warn(
        `Failed to fetch author profile for ${author.username}`,
        error
      );
    }
  }

  const newAuthor: InsertAuthor = {
    username: author.username,
    email,
    firstName: author.firstName,
    lastName: author.lastName,
    affiliation,
    website,
  };

  const result = await insertAuthor(newAuthor, {
    returning: { authorId: authors.authorId },
    onConflictDoUpdate: {
      target: [authors.username],
      set: buildConflictUpdateColumns(authors, ["rowCreatedAt"]),
    },
  });

  const resultArray = result as { authorId: number }[];
  if (resultArray.length === 0) {
    logger.warn(`Failed to insert author: ${author.username}`);
    return null;
  }

  return resultArray[0].authorId;
}
