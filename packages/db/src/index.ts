// biome-ignore lint/performance/noBarrelFile: package entry point re-exporting the client factory
export { createDb, type Db, type DbConfig } from "./client";
