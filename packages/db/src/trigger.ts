// This is the file which mainly exports Trigger - a class to create new Triggers

import type { SQL, SQLWrapper } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { BuildAliasTable, SQLiteTable } from "drizzle-orm/sqlite-core";
import { alias } from "drizzle-orm/sqlite-core";

type TableColumn<TTable extends SQLiteTable> =
  TTable["_"]["columns"][keyof TTable["_"]["columns"]];

type TriggerType = "INSERT" | "UPDATE" | "DELETE";
type TriggerTiming = "BEFORE" | "AFTER" | "INSTEAD OF";
type TriggerRow<TType extends TriggerType, TTable extends SQLiteTable> = Record<
  TType extends Exclude<TriggerType, "DELETE"> ? "newRow" : never,
  BuildAliasTable<TTable, "new">
> &
  Record<
    TType extends Exclude<TriggerType, "INSERT"> ? "oldRow" : never,
    BuildAliasTable<TTable, "old">
  >;

interface BaseTriggerData<
  TType extends TriggerType,
  TTable extends SQLiteTable,
> {
  /** Trigger name */
  name: string;
  /** On which operations should trigger activate */
  type: TType;
  /** When the trigger should activate (BEFORE, AFTER, or INSTEAD OF) */
  timing?: TriggerTiming;
  /** On which tables should trigger activate */
  on: TTable;
  /** Condition when trigger should activate */
  when?: (row: TriggerRow<TType, TTable>) => SQLWrapper;
  /** What operation to perform when trigger activates */
  do: (row: TriggerRow<TType, TTable>) => SQLWrapper;
}

interface UpdateTriggerData<TTable extends SQLiteTable>
  extends BaseTriggerData<"UPDATE", TTable> {
  /** On which column of `on` table should trigger activate */
  of?: TableColumn<TTable>;
}

type TriggerData<
  TType extends TriggerType = TriggerType,
  TTable extends SQLiteTable = SQLiteTable,
> =
  TType extends Extract<TriggerType, "UPDATE">
    ? UpdateTriggerData<TTable>
    : BaseTriggerData<TType, TTable>;

const endLine = sql`;`;
const newLine = sql`\n`;
const tab = sql`\t`;
const space = sql` `;
export const breakpoint = sql`--> statement-breakpoint`.append(newLine);

const TRIGGER_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export class Trigger<
  TType extends TriggerType = TriggerType,
  TTable extends SQLiteTable = SQLiteTable,
> {
  statement: SQL;

  constructor(data: TriggerData<TType, TTable>) {
    // Validate required fields
    if (!(data.name && data.type && data.on)) {
      throw new Error("Trigger name, type, and table are required");
    }

    if (!data.do) {
      throw new Error("Trigger action (do) is required");
    }

    // Validate trigger name format
    if (!TRIGGER_NAME_PATTERN.test(data.name)) {
      throw new Error(
        "Trigger name must start with a letter or underscore and contain only letters, numbers, and underscores"
      );
    }

    const timing = data.timing || "AFTER";
    const triggerTable = join(
      [
        sql.raw(timing),
        sql.raw(data.type),
        data.type === "UPDATE" && data.of
          ? join([sql`OF`, sql.identifier(data.of.name)], space)
          : undefined,
        sql`ON`,
        data.on,
      ],
      space
    );

    const newTable = alias(data.on, "new");
    const oldTable = alias(data.on, "old");

    const triggerCondition = data.when
      ? join([
          tab,
          join(
            [
              sql`FOR EACH ROW WHEN`,
              data.when({ newRow: newTable, oldRow: oldTable }),
            ],
            space
          ),
        ])
      : undefined;

    const createStatement = join(
      [
        join([sql`CREATE TRIGGER`, sql.identifier(data.name)], space),
        join([tab, triggerTable]),
        triggerCondition,
        sql`BEGIN`,
        join([
          tab,
          data.do({ newRow: newTable, oldRow: oldTable }).getSQL(),
          endLine,
        ]),
        sql`END`,
      ],
      newLine
    ).append(endLine);

    this.statement = join(
      [createDropTriggerStatement(data.name), createStatement],
      breakpoint
    );
  }
}

export function createDropTriggerStatement(name: string) {
  return join(
    [sql`DROP TRIGGER IF EXISTS`, sql.identifier(name)],
    space
  ).append(endLine);
}

const join: typeof sql.join = (chunks, separator) =>
  sql.join(chunks.filter(Boolean), separator);
