import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { createDb, type Db } from "../src/client";
import {
  finishSyncRun,
  insertSyncRunStart,
  selectLatestSyncRun,
} from "../src/queries/sync";

const SYNC_RUNS_SCHEMA = `CREATE TABLE sync_runs (
  sync_run_id INTEGER PRIMARY KEY,
  runner TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  finished_at INTEGER,
  papers_seen INTEGER NOT NULL DEFAULT 0,
  papers_new INTEGER NOT NULL DEFAULT 0,
  papers_updated INTEGER NOT NULL DEFAULT 0,
  papers_failed INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  row_created_at INTEGER,
  row_updated_at INTEGER
)`;

interface TestContext {
  db: Db;
  tempDir: string;
}

describe.sequential("sync run queries", () => {
  let context: TestContext;

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "lingbuzz-db-sync-"));
    const dbPath = join(tempDir, "test.db");

    const db = createDb({ url: `file:${dbPath}` });
    await db.run(SYNC_RUNS_SCHEMA);

    context = { db, tempDir };
  });

  afterEach(async () => {
    await rm(context.tempDir, { recursive: true, force: true });
  });

  test("records a run start and reads back the finished row", async () => {
    const startedAt = new Date("2026-07-04T10:00:00.000Z");
    const finishedAt = new Date("2026-07-04T10:05:00.000Z");

    const id = await insertSyncRunStart(context.db, {
      runner: "local",
      startedAt,
    });
    expect(id).toBeGreaterThan(0);

    await finishSyncRun(context.db, id, {
      finishedAt,
      papersSeen: 42,
      papersNew: 7,
      papersUpdated: 3,
      papersFailed: 1,
      success: true,
    });

    const latest = await selectLatestSyncRun(context.db);
    expect(latest).toBeDefined();
    expect(latest?.syncRunId).toBe(id);
    expect(latest?.runner).toBe("local");
    expect(latest?.startedAt).toEqual(startedAt);
    expect(latest?.finishedAt).toEqual(finishedAt);
    expect(latest?.papersSeen).toBe(42);
    expect(latest?.papersNew).toBe(7);
    expect(latest?.papersUpdated).toBe(3);
    expect(latest?.papersFailed).toBe(1);
    expect(latest?.success).toBe(true);
    expect(latest?.errorMessage).toBeNull();
  });

  test("selectLatestSyncRun returns the most recent run by startedAt", async () => {
    const older = await insertSyncRunStart(context.db, {
      runner: "gh-actions",
      startedAt: new Date("2026-07-01T00:00:00.000Z"),
    });
    await finishSyncRun(context.db, older, {
      finishedAt: new Date("2026-07-01T00:01:00.000Z"),
      papersSeen: 1,
      papersNew: 1,
      papersUpdated: 0,
      papersFailed: 0,
      success: true,
    });

    const newer = await insertSyncRunStart(context.db, {
      runner: "cf-worker",
      startedAt: new Date("2026-07-03T00:00:00.000Z"),
    });
    await finishSyncRun(context.db, newer, {
      finishedAt: new Date("2026-07-03T00:02:00.000Z"),
      papersSeen: 5,
      papersNew: 2,
      papersUpdated: 1,
      papersFailed: 0,
      success: true,
    });

    const latest = await selectLatestSyncRun(context.db);
    expect(latest?.syncRunId).toBe(newer);
    expect(latest?.runner).toBe("cf-worker");
  });

  test("an unfinished run is visible with finishedAt null", async () => {
    const startedAt = new Date("2026-07-05T12:00:00.000Z");
    const id = await insertSyncRunStart(context.db, {
      runner: "local",
      startedAt,
    });

    const latest = await selectLatestSyncRun(context.db);
    expect(latest?.syncRunId).toBe(id);
    expect(latest?.finishedAt).toBeNull();
    expect(latest?.success).toBe(false);
    expect(latest?.papersSeen).toBe(0);
  });

  test("records an error message on a failed run", async () => {
    const id = await insertSyncRunStart(context.db, {
      runner: "local",
      startedAt: new Date("2026-07-06T08:00:00.000Z"),
    });
    await finishSyncRun(context.db, id, {
      finishedAt: new Date("2026-07-06T08:00:30.000Z"),
      papersSeen: 0,
      papersNew: 0,
      papersUpdated: 0,
      papersFailed: 0,
      success: false,
      errorMessage: "network unreachable",
    });

    const latest = await selectLatestSyncRun(context.db);
    expect(latest?.success).toBe(false);
    expect(latest?.errorMessage).toBe("network unreachable");
  });
});
