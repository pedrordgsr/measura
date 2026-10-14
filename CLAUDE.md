# CLAUDE.md

**Measura** is an open-source clone of **Power BI Desktop** for Windows, macOS and Linux. The audience is people who already use Power BI: everything must work, and be located, where they expect it. **There is no AI layer in the product.**

- What and why: [docs/OVERVIEW.md](docs/OVERVIEW.md)
- How (full architecture): [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Where we are: [docs/ROADMAP.md](docs/ROADMAP.md)
- What is supported: [docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)

Naming: crates `measura-*`, packages `@measura/*`, app identifier `org.measura.desktop`.

**Language:** the repository is in **English**: code, comments, docs, commit messages, error messages, test data. The maintainer is Brazilian: talk to them in **Brazilian Portuguese** in chat.

---

## Golden rule: Power BI is the spec

The goal is to **produce the same result as Power BI**, not something similar.

- Before implementing a DAX/M function or a visual behavior, check the real behavior in [dax.guide](https://dax.guide), Microsoft's documentation (learn.microsoft.com) or *The Definitive Guide to DAX* (SQLBI). Cite the reference in the test.
- **Never invent semantics.** If the documentation is unclear (evaluation order, BLANK, result type, totals), write the test with the doubtful case marked `#[ignore = "confirm in Power BI: ..."]` and tell the user. Do not guess.
- When Power BI does something "weird" (BLANK = 0 is true, matrix total is not the sum of the rows, virtual blank row), **copy the weirdness**. Power BI users depend on it.
- Implement from public documentation. No reverse engineering of Microsoft binaries.

## Architecture invariants

Do not break these without discussing with the user first:

1. **Headless Rust core.** Logic lives in `crates/`. `apps/desktop/src-tauri` is a thin shell, because the same core will run on the server (stage 8) and in the browser via WASM (stage 7). No `tauri` inside `crates/`.
2. **The UI generates DAX and M, never SQL.** Only `measura-engine` (and later the `dax`/`mquery` compilers) writes SQL. Identifiers and literals always go through `quote_ident`/`quote_literal`. Never interpolate user input into SQL.
3. **Every visual is a `SUMMARIZECOLUMNS`-shaped query:** group-by columns, filters and measures, where implicit aggregation is an implicit measure. In stage 2, before the DAX engine exists, visuals must already build a typed structure equivalent to that (not ad-hoc SQL). In stage 3 the DAX engine compiles that same structure.
4. **The project format is PBIP/TMDL/PBIR.** Do not invent a format. Loaded data lives in `.cache/` (a `.duckdb` file), outside git.
5. **Model names follow TMDL** (`dataType: int64`, `crossFilteringBehavior: bothDirections`...). `measura-model` maps TMDL 1:1.
6. **DAX semantics from day one:** BLANK is not SQL NULL, auto-exist, virtual blank row, totals evaluated in the total's context. See ARCHITECTURE §5.1.

## Layout

```
crates/
  model/            measura-model    semantic model types (Table, Column, Measure, Relationship); TMDL
  engine/           measura-engine   DuckDB: import, schema, paged reads. The only place with SQL today
apps/desktop/
  src/              React: shell/ (ribbon, view rail, panes), views/ (the 3 views), lib/, i18n/
  src-tauri/        measura-desktop  thin Tauri commands over the crates
tests/fixtures/     sample data used by tests (Sales.csv, Product.csv)
docs/               overview, architecture, roadmap, compatibility
```

**Planned** crates and packages: create each one when its stage starts, not before.

| When | What |
|---|---|
| Stage 2 | `crates/report` (PBIR, visual queries), `packages/visuals` (ECharts) |
| Stage 3 | `crates/dax` (lexer, parser, plan, SQL compiler, evaluator), `packages/editors` (Monaco), `tests/dax-conformance/` |
| Stage 4 | `crates/mquery` (M parser, `Table.*` → SQL, interpreter), `tests/m-conformance/` |
| Stage 7 | `crates/wasm`, `apps/web` |
| Stage 8 | `crates/server` |

When the same React code is needed by both desktop and `apps/web`, move it to `packages/ui`.

## Commands

```sh
pnpm install                       # JS dependencies (repo root)
pnpm dev                           # run the desktop app (Vite + Tauri) in dev mode
cargo test --workspace             # Rust tests
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all
pnpm typecheck                     # tsc in every package
pnpm test                          # vitest
```

- The **first** build takes several minutes: DuckDB is compiled from C++ source (`bundled` feature). It is then cached in `target/`. When running it in the background, wait for completion instead of polling.
- On Windows you need MSVC (VS 2022 Build Tools) and WebView2.

**Before saying something is done:** `cargo test --workspace`, `cargo clippy ... -D warnings`, `pnpm typecheck` and `pnpm test` must pass. For visual changes, run `pnpm dev` and check the window, or say explicitly that you did not.

## Conventions

**Rust**
- One `Error` per crate with `thiserror`. No `unwrap`/`expect` outside tests (clippy warns). If unavoidable, `#[allow]` with the reason.
- `unsafe` is forbidden in the workspace.
- Shared dependencies go in `[workspace.dependencies]`; crates use `dep.workspace = true`.
- Types that cross to the frontend use `#[serde(rename_all = "camelCase")]`.
- Integration tests live in `crates/<x>/tests/` and use `tests/fixtures/`.

**Frontend (apps/desktop/src)**
- Strict TypeScript, with `noUncheckedIndexedAccess`.
- `lib/ipc.ts` is the **only** place that calls `invoke`. Each command there matches one in `src-tauri/src/commands.rs`, with the same name.
- `lib/model.ts` mirrors the Rust types by hand. When a serialized Rust struct changes, update it in the same commit. Code generation (specta/ts-rs) is on the roadmap.
- **Every visible string goes through `i18n/`.** `en.ts` is the source of truth; `pt-BR.ts` must have the same keys (the type checker enforces it). Use Power BI Desktop's official terms in each language ("Get data", "Table view", "Field wells" / "Obter dados", "Exibição de tabela", "Poços de campos"). When in doubt, use the term Power BI uses.
- Numbers and dates are formatted with the active locale (`lib/format.ts`).
- Global state in Zustand (`store.ts`). Local component state with `useState`.
- Styling with Tailwind v4. Color tokens live in `index.css` (`@theme`).
- Tauri commands are `async`: a sync command runs on the main thread and freezes the window.

**Branding:** the workflow is identical to Power BI, but the name, logo, icons and colors are our own (teal accent `#0f766e`, not Microsoft yellow). Never use "Power BI" in the UI. Docs may cite it as a reference.

## Pinned dependencies (and why)

- **React 18** (not 19): Glide Data Grid 6 requires React ≤ 18 in its peer deps. Revisit when Glide supports 19.
- **marked 4**: Glide Data Grid peer dependency.
- **duckdb 1.4 `bundled`**: compiles DuckDB in, no system library needed.

When adding a dependency, use `cargo add` or `pnpm add` (current version), never a version from memory.

## Workflow

- Follow the stage order in the [ROADMAP](docs/ROADMAP.md). Do not jump ahead to a future stage (e.g. the DAX engine during stage 1) unless the user asks.
- When an item is finished, tick it in `docs/ROADMAP.md`. When implementing a DAX/M function or a visual, update `docs/COMPATIBILITY.md`.
- Every new DAX function comes with tests: normal cases, BLANK, empty filter context, and the case cited in the reference.
- Small, verifiable changes. If a decision contradicts `ARCHITECTURE.md`, stop and ask, or update the document in the same change with the reason.
- Commit messages in English, imperative mood.
