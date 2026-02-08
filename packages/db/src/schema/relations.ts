import { relations } from "drizzle-orm";
import {
  authors,
  authorsToPapers,
  keywords,
  keywordsToPapers,
  papers,
} from ".";

export const authorsRelations = relations(authors, ({ many }) => ({
  authorsToPapers: many(authorsToPapers),
}));

export const papersRelations = relations(papers, ({ many }) => ({
  authorsToPapers: many(authorsToPapers),
  keywordsToPapers: many(keywordsToPapers),
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  keywordsToPapers: many(keywordsToPapers),
}));

export const authorsToPapersRelations = relations(
  authorsToPapers,
  ({ one }) => ({
    author: one(authors, {
      fields: [authorsToPapers.authorId],
      references: [authors.authorId],
    }),

    paper: one(papers, {
      fields: [authorsToPapers.paperId],
      references: [papers.paperId],
    }),
  })
);

export const keywordsToPapersRelations = relations(
  keywordsToPapers,
  ({ one }) => ({
    keyword: one(keywords, {
      fields: [keywordsToPapers.keywordId],
      references: [keywords.keywordId],
    }),
    paper: one(papers, {
      fields: [keywordsToPapers.paperId],
      references: [papers.paperId],
    }),
  })
);
