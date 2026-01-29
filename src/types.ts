export interface Paper {
  id: string;
  title: string;
  authors: string[];
  date: string;
  published_in: string;
  keywords: string[];
  keywords_raw: string;
  abstract: string;
  link: string;
  downloads: number;
}

export interface Author {
  firstName: string;
  lastName: string;
  authorUrl: string;
  username: string;
}

export interface Article {
  id: string;
  authors: Record<number, Author>;
  pdfLink: string | null;
  paperURL: string;
  title: string;
}
