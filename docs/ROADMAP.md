# Roadmap

The stages are those in [ARCHITECTURE.md §11](ARCHITECTURE.md#11-stages). This file details the stage in progress.

**Current stage: 1. Foundation**

---

## Stage 1. Foundation

**Done when:** you can import spreadsheets, see the data, relate tables, save and reopen.

### Groundwork
- [x] Monorepo: Cargo workspace + pnpm workspace, `CLAUDE.md`
- [x] `measura-model`: model types (table, column, measure, relationship) with TMDL names
- [x] `measura-engine`: embedded DuckDB, CSV import, schema with TMDL types, paged reads
- [x] Tauri app: ribbon, three-view rail, Data pane
- [x] Table view: paged grid (Glide Data Grid) with locale-aware formatting
- [x] UI in English (default) and Brazilian Portuguese
- [ ] Verify the desktop app builds and runs (`cargo clippy` on the whole workspace, `pnpm dev`)
- [ ] GitHub Actions CI: tests, clippy and typecheck on Windows, macOS and Linux
- [ ] Generate `lib/model.ts` from the Rust types (specta or ts-rs)

### Data
- [ ] Import Excel (`.xlsx`): pick sheets/tables, like Power BI's Navigator
- [ ] Import Parquet
- [ ] CSV preview dialog before loading (delimiter, encoding, first row as headers)
- [ ] Refresh (reload from source)

### Project
- [ ] Write TMDL (`model.tmdl`, `tables/*.tmdl`, `relationships.tmdl`) from `measura-model`
- [ ] Read TMDL into `measura-model` (round-trip tests)
- [ ] Full PBIP layout (`.pbip`, `.SemanticModel/`, `.Report/`) and `.duckdb` cache in `.cache/`
- [ ] File: New, Open, Save, Save as; unsaved changes warning

### Model view
- [ ] Diagram with React Flow + ELK: draggable tables, positions saved in the project
- [ ] Create a relationship by dragging one column onto another
- [ ] Edit relationship: cardinality, cross-filter direction, active or inactive
- [ ] Relationship autodetection on load (same name + uniqueness on the one side)
- [ ] Properties pane: rename, data type, format, hide, sort by column

### Table view
- [ ] Sort and filter from the column header (view only, as in Power BI)
- [ ] Select a column when clicking it in the Data pane

---

## Next stages (summary)

| Stage | Delivers |
|---|---|
| 2. Reports | Canvas, Visualizations/Filters panes, core visuals, slicers, cross-filtering |
| 3. Essential DAX | DAX engine with the essential functions, formula bar, conformance suite |
| 4. Power Query | M engine, editor with Applied Steps and Advanced Editor |
| 5. Everyday DAX | Iterators, context transition, calculated columns, time intelligence |
| 6. Open PBIP | Read Power BI projects (TMDL + PBIR), themes |
| 7. Publish | Static site with DuckDB-WASM |
| 8. Server | Docker, workspaces, scheduled refresh, RLS |
