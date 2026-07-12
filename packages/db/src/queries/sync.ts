import { desc, eq } from "drizzle-orm";
import type { Db } from "../client";
import { syncRuns } from "../schema";

export type SyncRun = typeof syncRuns.$inferSelect;

export interface SyncRunStart {
  runner: string;
  startedAt: Date;
}

export interface SyncRunFinish {
  finishedAt: Date;
  papersSeen: number;
  papersNew: number;
  papersUpdated: number;
  papersFailed: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * Inserts a row marking the start of a Sync run and returns its id.
 */
export async function insertSyncRunStart(
  db: Db,
  { runner, startedAt }: SyncRunStart
): Promise<number> {
  const [row] = await db
    .insert(syncRuns)
    .values({ runner, startedAt })
    .returning({ syncRunId: syncRuns.syncRunId });
  return row.syncRunId;
}

/**
 * Fills in the outcome columns of a previously started Sync run.
 */
export async function finishSyncRun(
  db: Db,
  id: number,
  finish: SyncRunFinish
): Promise<void> {
  await db.update(syncRuns).set(finish).where(eq(syncRuns.syncRunId, id));
}

/**
 * Returns the most recent Sync run by `startedAt`, or undefined if none exist.
 */
export async function selectLatestSyncRun(
  db: Db
): Promise<SyncRun | undefined> {
  const [row] = await db
    .select()
    .from(syncRuns)
    .orderBy(desc(syncRuns.startedAt))
    .limit(1);
  return row;
}
