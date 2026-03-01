import type { SQLiteColumnBuilders } from "drizzle-orm/sqlite-core/columns/all";

export const rowTimestampColumns = (t: SQLiteColumnBuilders) => {
  return {
    rowCreatedAt: t.integer({ mode: "timestamp" }).$defaultFn(() => new Date()),
    rowUpdatedAt: t
      .integer({ mode: "timestamp" })
      .$defaultFn(() => new Date())
      .$onUpdate(() => new Date()),
  };
};

export const recordTimestampColumns = (t: SQLiteColumnBuilders) => {
  return {
    dataCreatedAt: t.integer({ mode: "timestamp" }).notNull(),
    dataUpdatedAt: t.integer({ mode: "timestamp" }).notNull(),
  };
};
