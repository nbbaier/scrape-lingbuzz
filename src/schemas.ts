import { z } from "zod";

export const PaperSchema = z.object({
  id: z.string(),
  title: z.string(),
  authors: z.array(z.string()),
  date: z.string(),
  published_in: z.string(),
  keywords: z.array(z.string()),
  keywords_raw: z.string(),
  abstract: z.string(),
  link: z.string().url(),
  downloads: z.number().int().nonnegative(),
});

export type Paper = z.infer<typeof PaperSchema>;

export const AuthorSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  authorUrl: z.string(),
  username: z.string(),
});

export const ArticleSchema = z.object({
  id: z.string(),
  authors: z.record(z.number(), AuthorSchema),
  pdfLink: z.string().nullable(),
  paperURL: z.string().url(),
  title: z.string(),
});

export type Article = z.infer<typeof ArticleSchema>;
