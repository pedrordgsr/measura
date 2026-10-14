// The only place that calls Tauri commands. Command names match apps/desktop/src-tauri/src/commands.rs.

import { invoke } from "@tauri-apps/api/core";
import type { RowSet, Table } from "./model";

export const ipc = {
  importCsv: (path: string) => invoke<Table>("import_csv", { path }),
  tableRows: (table: string, offset: number, limit: number) =>
    invoke<RowSet>("table_rows", { table, offset, limit }),
};
