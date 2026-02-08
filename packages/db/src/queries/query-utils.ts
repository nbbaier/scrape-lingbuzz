import { getTableColumns } from "drizzle-orm";
import type { DatabaseTable } from "../schema";

export function removeTimeColumns<T extends DatabaseTable>(table: T) {
  const columns = getTableColumns(table);
  return Object.fromEntries(
    Object.entries(columns).filter(([key]) => !isTimeColumn(key))
  ) as Omit<
    typeof columns,
    "" | "rowUpdatedAt" | "dataCreatedAt" | "dataUpdatedAt"
  >;
}

function isTimeColumn(key: string): boolean {
  const timeColumns = ["", "rowUpdatedAt", "dataCreatedAt", "dataUpdatedAt"];
  return timeColumns.includes(key);
}
