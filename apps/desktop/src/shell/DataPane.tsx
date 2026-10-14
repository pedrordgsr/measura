import { useState } from "react";
import { t } from "../i18n";
import { isNumeric, type Column } from "../lib/model";
import { useApp } from "../store";

/** "Data" pane: tables and their fields. Present in all three views, as in Power BI. */
export function DataPane() {
  const tables = useApp((s) => s.tables);
  const selected = useApp((s) => s.selectedTable);
  const selectTable = useApp((s) => s.selectTable);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const q = query.trim().toLowerCase();

  return (
    <aside className="flex w-64 flex-col border-l border-line bg-pane">
      <h2 className="px-3 pb-1 pt-2 text-sm font-semibold">{t.panes.data}</h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.panes.searchPlaceholder}
        className="mx-3 mb-2 rounded border border-line bg-white px-2 py-1 outline-none focus:border-accent"
      />
      <div className="flex-1 overflow-auto pb-2">
        {tables.map((table) => {
          const columns = table.columns.filter((c) => !q || c.name.toLowerCase().includes(q));
          if (q && columns.length === 0 && !table.name.toLowerCase().includes(q)) return null;
          const isCollapsed = collapsed[table.name] && !q;
          return (
            <div key={table.name}>
              <button
                onClick={() => {
                  selectTable(table.name);
                  setCollapsed((c) => ({ ...c, [table.name]: !c[table.name] }));
                }}
                className={`flex w-full items-center gap-1.5 px-3 py-1 text-left hover:bg-accent-soft ${
                  table.name === selected ? "font-semibold" : ""
                }`}
              >
                <span className="w-3 text-gray-500">{isCollapsed ? "›" : "⌄"}</span>
                <TableIcon />
                {table.name}
              </button>
              {!isCollapsed &&
                columns.map((c) => (
                  <div key={c.name} className="flex items-center gap-1.5 py-0.5 pl-10 pr-3 hover:bg-accent-soft">
                    <FieldIcon column={c} />
                    <span className="truncate">{c.name}</span>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function TableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 9h18M9 4v16" />
    </svg>
  );
}

/** Σ marks numeric columns that get an implicit aggregation, like in Power BI. */
function FieldIcon({ column }: { column: Column }) {
  const glyph = isNumeric(column.dataType) ? "Σ" : column.dataType === "dateTime" ? "📅" : "";
  return <span className="w-4 text-center text-[11px] text-gray-500">{glyph}</span>;
}
