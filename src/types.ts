export interface Paper {
  abstract: string;
  authors: string[];
  date: string;
  downloads: number;
  id: string;
  keywords: string[];
  keywords_raw: string;
  link: string;
  published_in: string;
  title: string;
}

export interface Author {
  authorUrl: string;
  firstName: string;
  lastName: string;
  username: string;
}

export interface Article {
  authors: Record<number, Author>;
  id: string;
  paperURL: string;
  pdfLink: string | null;
  title: string;
}
