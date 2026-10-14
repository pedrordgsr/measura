import { create } from "zustand";
import { ipc } from "./lib/ipc";
import type { Table } from "./lib/model";

export type View = "report" | "table" | "model";

interface AppState {
  view: View;
  tables: Table[];
  selectedTable: string | null;
  error: string | null;
  setView: (view: View) => void;
  selectTable: (name: string) => void;
  importCsv: (path: string) => Promise<void>;
  clearError: () => void;
}

export const useApp = create<AppState>((set) => ({
  view: "report",
  tables: [],
  selectedTable: null,
  error: null,
  setView: (view) => set({ view }),
  selectTable: (name) => set({ selectedTable: name }),
  importCsv: async (path) => {
    try {
      const table = await ipc.importCsv(path);
      set((s) => ({
        tables: [...s.tables.filter((t) => t.name !== table.name), table],
        selectedTable: table.name,
      }));
    } catch (e) {
      set({ error: String(e) });
    }
  },
  clearError: () => set({ error: null }),
}));
