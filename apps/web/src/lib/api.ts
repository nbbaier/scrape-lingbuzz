const API_URL = import.meta.env.PUBLIC_API_URL ?? "http://localhost:8787";

export interface ApiAuthor {
  firstName: string | null;
  lastName: string | null;
}

export interface ApiPaperAuthorLink {
  authorPosition: number;
  author: ApiAuthor;
}

export interface ApiPaper {
  paperId: number;
  lingbuzzId: string;
  paperTitle: string;
  publishedIn: string | null;
  paperYear: string;
  paperMonth: string;
  keywordsRaw: string | null;
  abstract: string | null;
  paperReference: string;
  downloads: number | null;
  downloadUrl: string | null;
  paperUrl: string | null;
  authorsToPapers: ApiPaperAuthorLink[];
}

export interface SyncRun {
  runner: string;
  startedAt: string;
  finishedAt: string;
  papersNew: number;
  papersUpdated: number;
  success: boolean;
}

export type GetPapersResult =
  | { ok: true; data: ApiPaper[]; limit: number; offset: number }
  | { ok: false; error: string };

export type GetLatestSyncResult =
  | { ok: true; data: SyncRun }
  | { ok: false; error: string };

const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
const UNREACHABLE_ERROR = "Could not reach the lingbuzz API";

export async function getPapers({
  limit = DEFAULT_LIMIT,
  offset = DEFAULT_OFFSET,
}: {
  limit?: number;
  offset?: number;
} = {}): Promise<GetPapersResult> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/papers?${params.toString()}`);
  } catch {
    return { ok: false, error: UNREACHABLE_ERROR };
  }

  const body = (await response.json().catch(() => null)) as {
    data?: ApiPaper[];
    limit?: number;
    offset?: number;
    error?: string;
  } | null;

  if (!(response.ok && body?.data)) {
    return { ok: false, error: body?.error ?? "Failed to load papers" };
  }

  return {
    ok: true,
    data: body.data,
    limit: body.limit ?? limit,
    offset: body.offset ?? offset,
  };
}

export async function getLatestSync(): Promise<GetLatestSyncResult> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/sync/latest`);
  } catch {
    return { ok: false, error: UNREACHABLE_ERROR };
  }

  const body = (await response.json().catch(() => null)) as {
    data?: SyncRun;
    error?: string;
  } | null;

  if (!(response.ok && body?.data)) {
    return { ok: false, error: body?.error ?? "Sync status unavailable" };
  }

  return { ok: true, data: body.data };
}
