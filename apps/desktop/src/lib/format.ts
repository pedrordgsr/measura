import type { CellValue, DataType } from "./model";

const integer = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 15 });

/** Default display of a raw value in the table view (no format string applied yet). */
export function formatCell(value: CellValue, dataType: DataType): string {
  if (value === null) return "";
  switch (dataType) {
    case "int64":
      return typeof value === "number" ? integer.format(value) : String(value);
    case "double":
    case "decimal": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isNaN(n) ? String(value) : decimal.format(n);
    }
    case "boolean":
      return value ? "Verdadeiro" : "Falso";
    case "dateTime":
      return formatDate(String(value));
    default:
      return String(value);
  }
}

/** `2025-01-05` → `05/01/2025`; `2025-01-05 13:30:00` → `05/01/2025 13:30:00`. */
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}:\d{2}))?/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d, time] = m;
  return time ? `${d}/${mo}/${y} ${time}` : `${d}/${mo}/${y}`;
}
