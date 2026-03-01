export type PaperStatus = "new" | "freshly changed" | string;

export interface ListingAuthor {
  firstName: string;
  lastName: string;
  authorUrl: string;
  username: string;
}

export interface EnrichedAuthor extends ListingAuthor {
  email: string;
  affiliation: string;
  website: string;
}

export interface ListingRow {
  paperId: string;
  title: string;
  status: PaperStatus;
  authors: Map<number, ListingAuthor>;
  downloadUrl: string;
  paperUrl: string;
}

export interface ParsedPaper {
  lingbuzzId: string;
  title: string;
  date: string;
  publishedIn: string;
  keywordsRaw: string;
  keywords: string[];
  abstract: string;
  downloads: number;
  downloadUrl: string;
  paperUrl: string;
}
