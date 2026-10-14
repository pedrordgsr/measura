import { locale as activeLocale, stringsFor, type Locale } from "../i18n";
import type { CellValue, DataType } from "./model";

const formatters = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>();

function cached<T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, make: () => T): T {
  let f = formatters.get(key);
  if (!f) {
    f = make();
    formatters.set(key, f);
  }
  return f as T;
}

const integer = (l: Locale) =>
  cached(`int:${l}`, () => new Intl.NumberFormat(l, { maximumFractionDigits: 0 }));
const decimal = (l: Locale) =>
  cached(`dec:${l}`, () => new Intl.NumberFormat(l, { maximumFractionDigits: 15 }));
const date = (l: Locale) =>
  cached(
    `date:${l}`,
    () => new Intl.DateTimeFormat(l, { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" }),
  );
const time = (l: Locale) =>
  cached(
    `time:${l}`,
    () => new Intl.DateTimeFormat(l, { hour: "numeric", minute: "2-digit", second: "2-digit", timeZone: "UTC" }),
  );

/** Default display of a raw value in the table view (no format string applied yet). */
export function formatCell(value: CellValue, dataType: DataType, locale: Locale = activeLocale): string {
  if (value === null) return "";
  switch (dataType) {
    case "int64":
      return typeof value === "number" ? integer(locale).format(value) : String(value);
    case "double":
    case "decimal": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isNaN(n) ? String(value) : decimal(locale).format(n);
    }
    case "boolean":
      return value ? stringsFor(locale).values.true : stringsFor(locale).values.false;
    case "dateTime":
      return formatDateTime(String(value), locale);
    default:
      return String(value);
  }
}

/** `2025-01-05` → `1/5/2025` (en-US) or `05/01/2025` (pt-BR); time is appended when present. */
function formatDateTime(iso: string, locale: Locale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/.exec(iso);
  if (!m) return iso;
  const [y, mo, d, h, mi, s] = m.slice(1).map((part) => Number(part ?? 0));
  const instant = new Date(Date.UTC(y!, mo! - 1, d!, h!, mi!, s!));
  const day = date(locale).format(instant);
  if (m[4] === undefined) return day;
  // ICU uses a narrow no-break space before AM/PM; normalize to a plain space.
  return `${day} ${time(locale).format(instant).replace(/ /g, " ")}`;
}
