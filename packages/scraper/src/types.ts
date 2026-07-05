export type PaperStatus = "new" | "freshly changed" | string;

export interface ListingAuthor {
  authorUrl: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface EnrichedAuthor extends ListingAuthor {
  affiliation: string;
  email: string;
  website: string;
}

export interface ListingRow {
  authors: Map<number, ListingAuthor>;
  downloadUrl: string;
  paperId: string;
  paperUrl: string;
  status: PaperStatus;
  title: string;
}

export interface ParsedPaper {
  abstract: string;
  date: string;
  downloads: number;
  downloadUrl: string;
  keywords: string[];
  keywordsRaw: string;
  lingbuzzId: string;
  paperUrl: string;
  publishedIn: string;
  title: string;
}
