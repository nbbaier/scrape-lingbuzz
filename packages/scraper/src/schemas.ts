import { z } from "zod";

export const ParsedPaperSchema = z.object({
  lingbuzzId: z.string(),
  title: z.string(),
  date: z.string(),
  publishedIn: z.string(),
  keywordsRaw: z.string(),
  keywords: z.array(z.string()),
  abstract: z.string(),
  downloads: z.number().int().nonnegative(),
  downloadUrl: z.string(),
  paperUrl: z.string().url(),
});

export type ParsedPaperSchemaType = z.infer<typeof ParsedPaperSchema>;
