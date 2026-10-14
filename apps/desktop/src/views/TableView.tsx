import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { DataEditor, GridCellKind, type GridCell, type GridColumn, type Item } from "@glideapps/glide-data-grid";
import { ipc } from "../lib/ipc";
import { formatCell } from "../lib/format";
import { isNumeric, type CellValue, type Column } from "../lib/model";
import { t } from "../lib/strings";
import { useApp } from "../store";

const PAGE_SIZE = 500;

/** "Exibição de tabela": read-only grid of the selected table, loaded page by page. */
export function TableView() {
  const tableName = useApp((s) => s.selectedTable);
  if (!tableName) {
    return <div className="flex h-full items-center justify-center text-gray-400">{t.table.noTable}</div>;
  }
  // key: reset the page cache when the table changes
  return <TableGrid key={tableName} table={tableName} />;
}

function TableGrid({ table }: { table: string }) {
  const { columns, totalRows, getRow } = useRowPages(table);

  const gridColumns = useMemo<GridColumn[]>(
    () => columns.map((c) => ({ id: c.name, title: c.name, width: 150 })),
    [columns],
  );

  const getCellContent = useCallback(
    ([col, row]: Item): GridCell => {
      const values = getRow(row);
      const column = columns[col];
      if (!values || !column) return { kind: GridCellKind.Loading, allowOverlay: false };
      const value = values[col] ?? null;
      return {
        kind: GridCellKind.Text,
        data: value === null ? "" : String(value),
        displayData: formatCell(value, column.dataType),
        allowOverlay: false,
        contentAlign: isNumeric(column.dataType) ? "right" : "left",
      };
    },
    [columns, getRow],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        {columns.length > 0 && (
          <DataEditor
            columns={gridColumns}
            rows={totalRows}
            getCellContent={getCellContent}
            rowMarkers="number"
            smoothScrollX
            smoothScrollY
            width="100%"
            height="100%"
          />
        )}
      </div>
      <div className="border-t border-line bg-white px-3 py-1 text-gray-500">
        {table} · {t.table.rows(totalRows)}
      </div>
    </div>
  );
}

function useRowPages(table: string) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const pages = useRef(new Map<number, CellValue[][]>());
  const loading = useRef(new Set<number>());
  const [version, bump] = useReducer((x: number) => x + 1, 0);
  const setError = useCallback((e: unknown) => useApp.setState({ error: String(e) }), []);

  const loadPage = useCallback(
    (page: number) => {
      if (pages.current.has(page) || loading.current.has(page)) return;
      loading.current.add(page);
      ipc
        .tableRows(table, page * PAGE_SIZE, PAGE_SIZE)
        .then((rs) => {
          pages.current.set(page, rs.rows);
          setColumns((prev) => (prev.length ? prev : rs.columns));
          setTotalRows(rs.totalRows);
          bump();
        })
        .catch(setError)
        .finally(() => loading.current.delete(page));
    },
    [table, setError],
  );

  useEffect(() => loadPage(0), [loadPage]);

  // `version` changes the callback identity so the grid redraws when a page arrives.
  const getRow = useCallback(
    (row: number) => {
      const page = Math.floor(row / PAGE_SIZE);
      const rows = pages.current.get(page);
      if (!rows) {
        loadPage(page);
        return undefined;
      }
      return rows[row % PAGE_SIZE];
    },
    [loadPage, version],
  );

  return { columns, totalRows, getRow };
}
