//! Tauri commands. Each one is mirrored in `apps/desktop/src/lib/ipc.ts`.
//!
//! Commands are `async` so they run off the main thread and never freeze the window.
//! Errors cross the boundary as user-facing strings.

use std::path::PathBuf;

use measura_engine::{table_name_from_path, RowSet};
use measura_model::Table;
use tauri::State;

use crate::AppState;

type CmdResult<T> = Result<T, String>;

fn engine(
    state: &State<'_, AppState>,
) -> CmdResult<std::sync::MutexGuard<'_, measura_engine::Engine>> {
    state
        .engine
        .lock()
        .map_err(|_| "the data engine is unavailable".to_owned())
}

#[tauri::command]
pub async fn import_csv(state: State<'_, AppState>, path: PathBuf) -> CmdResult<Table> {
    let name = table_name_from_path(&path);
    engine(&state)?
        .import_csv(&path, &name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn table_rows(
    state: State<'_, AppState>,
    table: String,
    offset: u64,
    limit: u64,
) -> CmdResult<RowSet> {
    engine(&state)?
        .rows(&table, offset, limit)
        .map_err(|e| e.to_string())
}
