import { selectPaperByLingbuzzId } from "@lingbuzz/db/queries/select";
import type { ListingRow } from "./types";

export type ScrapeAction =
  | { action: "full-scrape"; row: ListingRow }
  | { action: "update-version"; row: ListingRow }
  | { action: "skip"; row: ListingRow; reason: string };

/**
 * Classifies listing rows into scrape actions based on status and DB state.
 *
 * - "freshly changed" → always update-version
 * - "new" + not in DB → full-scrape
 * - "new" + in DB → skip
 * - date-only + not in DB → full-scrape
 * - date-only + in DB → skip
 */
export async function classifyRows(
  rows: ListingRow[]
): Promise<ScrapeAction[]> {
  const actions: ScrapeAction[] = [];

  for (const row of rows) {
    if (row.status === "freshly changed") {
      actions.push({ action: "update-version", row });
      continue;
    }

    const existing = await selectPaperByLingbuzzId(row.paperId);

    if (existing) {
      actions.push({
        action: "skip",
        row,
        reason: `Paper ${row.paperId} already in DB`,
      });
    } else {
      actions.push({ action: "full-scrape", row });
    }
  }

  return actions;
}
