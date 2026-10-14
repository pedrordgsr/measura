//! Desktop shell. Keep this crate thin: commands only translate between the UI and the core
//! crates. Business logic belongs in `crates/`, where it can be reused by the server and WASM.

mod commands;

use std::sync::Mutex;

use measura_engine::Engine;

pub struct AppState {
    pub engine: Mutex<Engine>,
}

#[allow(clippy::expect_used)] // nothing can run without the window or the engine
pub fn run() {
    let engine = Engine::in_memory().expect("falha ao iniciar o DuckDB");

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            engine: Mutex::new(engine),
        })
        .invoke_handler(tauri::generate_handler![
            commands::import_csv,
            commands::table_rows
        ])
        .run(tauri::generate_context!())
        .expect("falha ao iniciar o aplicativo");
}
