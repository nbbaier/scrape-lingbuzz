import { describe, expect, test, vi } from "vitest";
import type { ListingRow } from "../src/types";

// Mock @lingbuzz/db before importing detect
vi.mock("@lingbuzz/db/queries/select", () => ({
  selectPaperByLingbuzzId: vi.fn(),
}));

import { selectPaperByLingbuzzId } from "@lingbuzz/db/queries/select";
import { classifyRows } from "../src/detect";

const mockSelect = selectPaperByLingbuzzId as ReturnType<typeof vi.fn>;

function makeRow(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    paperId: "007001",
    title: "Test Paper",
    status: "new",
    authors: new Map(),
    downloadUrl: "https://ling.auf.net/lingbuzz/007001/current.pdf",
    paperUrl: "https://ling.auf.net/lingbuzz/007001",
    ...overrides,
  };
}

describe("classifyRows", () => {
  test("freshly changed → always update-version", async () => {
    const rows = [makeRow({ status: "freshly changed" })];
    const actions = await classifyRows(rows);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("update-version");
    // Should not query DB for freshly changed
    expect(mockSelect).not.toHaveBeenCalled();
  });

  test("new + not in DB → full-scrape", async () => {
    mockSelect.mockResolvedValueOnce(undefined);
    const rows = [makeRow({ status: "new" })];
    const actions = await classifyRows(rows);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("full-scrape");
  });

  test("new + in DB → skip", async () => {
    mockSelect.mockResolvedValueOnce({ paperId: 1, lingbuzzId: "007001" });
    const rows = [makeRow({ status: "new" })];
    const actions = await classifyRows(rows);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("skip");
  });

  test("date-only + not in DB → full-scrape", async () => {
    mockSelect.mockResolvedValueOnce(undefined);
    const rows = [makeRow({ status: "2026-01" })];
    const actions = await classifyRows(rows);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("full-scrape");
  });

  test("date-only + in DB → skip", async () => {
    mockSelect.mockResolvedValueOnce({ paperId: 1, lingbuzzId: "007001" });
    const rows = [makeRow({ status: "2026-01" })];
    const actions = await classifyRows(rows);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("skip");
  });

  test("classifies mixed rows correctly", async () => {
    mockSelect.mockResolvedValueOnce(undefined); // new, not in DB
    // freshly changed skips DB check
    mockSelect.mockResolvedValueOnce({ paperId: 2, lingbuzzId: "005000" }); // date, in DB

    const rows = [
      makeRow({ paperId: "007001", status: "new" }),
      makeRow({ paperId: "006500", status: "freshly changed" }),
      makeRow({ paperId: "005000", status: "2025-06" }),
    ];

    const actions = await classifyRows(rows);
    expect(actions).toHaveLength(3);
    expect(actions[0].action).toBe("full-scrape");
    expect(actions[1].action).toBe("update-version");
    expect(actions[2].action).toBe("skip");
  });
});
