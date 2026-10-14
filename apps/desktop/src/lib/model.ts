// Mirrors of the Rust types in crates/model and crates/engine (serde camelCase).
// Keep in sync by hand until we generate them (ts-rs/specta).

export type DataType =
  | "string"
  | "int64"
  | "double"
  | "decimal"
  | "dateTime"
  | "boolean"
  | "binary"
  | "variant";

export interface Column {
  name: string;
  dataType: DataType;
  sourceColumn: string | null;
  expression: string | null;
  formatString: string | null;
  isHidden: boolean;
}

export interface Measure {
  name: string;
  expression: string;
  formatString: string | null;
  displayFolder: string | null;
}

export interface Table {
  name: string;
  columns: Column[];
  measures: Measure[];
  source: string | null;
  isHidden: boolean;
}

export type CellValue = string | number | boolean | null;

export interface RowSet {
  columns: Column[];
  rows: CellValue[][];
  totalRows: number;
}

export const isNumeric = (t: DataType) => t === "int64" || t === "double" || t === "decimal";
