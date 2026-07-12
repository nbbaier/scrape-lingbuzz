import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("@lingbuzz/db/queries/sync", () => ({
  selectLatestSyncRun: vi.fn(),
}));

import type { Db } from "@lingbuzz/db";
import { selectLatestSyncRun } from "@lingbuzz/db/queries/sync";
import { Hono } from "hono";
import syncRoute from "../src/routes/sync";

const mockSelectLatestSyncRun = vi.mocked(selectLatestSyncRun);

const mockDb = {} as Db;

function createApp() {
  const app = new Hono();
  app.use("*", async (c, next) => {
    c.set("db", mockDb);
    await next();
  });
  app.route("/", syncRoute);
  return app;
}

const app = createApp();

describe("GET /latest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns the latest sync run projection", async () => {
    const startedAt = new Date("2026-07-04T10:00:00.000Z");
    const finishedAt = new Date("2026-07-04T10:05:00.000Z");
    mockSelectLatestSyncRun.mockResolvedValueOnce({
      syncRunId: 3,
      runner: "gh-actions",
      startedAt,
      finishedAt,
      papersSeen: 42,
      papersNew: 7,
      papersUpdated: 3,
      papersFailed: 1,
      success: true,
      errorMessage: null,
      rowCreatedAt: startedAt,
      rowUpdatedAt: finishedAt,
    });

    const response = await app.request("http://localhost/latest");

    expect(response.status).toBe(200);
    expect(mockSelectLatestSyncRun).toHaveBeenCalledWith(mockDb);
    await expect(response.json()).resolves.toEqual({
      data: {
        runner: "gh-actions",
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        papersNew: 7,
        papersUpdated: 3,
        success: true,
      },
    });
  });

  test("returns 404 when no sync runs are recorded", async () => {
    mockSelectLatestSyncRun.mockResolvedValueOnce(undefined);

    const response = await app.request("http://localhost/latest");

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "No sync runs recorded",
    });
  });
});
