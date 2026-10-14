import { t } from "../i18n";
import { useApp } from "../store";

// Placeholder layout: one card per table. Stage 1 replaces this with React Flow + ELK
// (drag tables, draw relationships, properties pane).
export function ModelView() {
  const tables = useApp((s) => s.tables);

  if (tables.length === 0) {
    return <div className="flex h-full items-center justify-center text-gray-400">{t.model.empty}</div>;
  }

  return (
    <div className="flex h-full flex-wrap content-start gap-8 overflow-auto bg-canvas p-8">
      {tables.map((table) => (
        <div key={table.name} className="w-52 border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-chrome px-3 py-1.5 font-semibold">{table.name}</div>
          <ul className="py-1">
            {table.columns.map((c) => (
              <li key={c.name} className="truncate px-3 py-0.5">
                {c.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
