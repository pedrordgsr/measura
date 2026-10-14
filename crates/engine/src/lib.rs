//! Storage engine: plays the role of VertiPaq on top of DuckDB.
//!
//! Only this crate talks SQL. Upper layers (DAX, M, UI) never build SQL strings themselves;
//! they go through the engine. See `docs/ARQUITETURA.md`, section 2.

mod sql;

use std::path::Path;

use duckdb::{params, Connection};
use measura_model::{Column, Table};
use serde::Serialize;

pub use sql::quote_ident;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("DuckDB error: {0}")]
    DuckDb(#[from] duckdb::Error),
    #[error("table not found: {0}")]
    TableNotFound(String),
    #[error("invalid path: {0}")]
    InvalidPath(String),
}

pub type Result<T> = std::result::Result<T, Error>;

/// A page of rows, ready to be sent to the UI.
///
/// Values are JSON for now. Switch to Arrow IPC when grids need large pages (see CLAUDE.md).
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RowSet {
    pub columns: Vec<Column>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: u64,
}

pub struct Engine {
    conn: Connection,
}

impl Engine {
    pub fn in_memory() -> Result<Self> {
        Ok(Self {
            conn: Connection::open_in_memory()?,
        })
    }

    pub fn open(path: &Path) -> Result<Self> {
        Ok(Self {
            conn: Connection::open(path)?,
        })
    }

    /// Loads a CSV file into a table (replacing it if it exists) and returns its model definition.
    pub fn import_csv(&self, path: &Path, table_name: &str) -> Result<Table> {
        let path = path
            .to_str()
            .ok_or_else(|| Error::InvalidPath(path.display().to_string()))?;
        self.conn.execute_batch(&format!(
            "CREATE OR REPLACE TABLE {} AS SELECT * FROM read_csv({}, header = true)",
            quote_ident(table_name),
            sql::quote_literal(path),
        ))?;
        self.table(table_name)
    }

    /// Model definition of a loaded table, with column types mapped to TMDL data types.
    pub fn table(&self, table_name: &str) -> Result<Table> {
        let mut stmt = self.conn.prepare(
            "SELECT column_name, data_type FROM information_schema.columns \
             WHERE table_name = ? ORDER BY ordinal_position",
        )?;
        let columns = stmt
            .query_map(params![table_name], |row| {
                let name: String = row.get(0)?;
                let duck_type: String = row.get(1)?;
                Ok(Column {
                    data_type: sql::data_type_from_duckdb(&duck_type),
                    source_column: Some(name.clone()),
                    name,
                    expression: None,
                    format_string: None,
                    is_hidden: false,
                })
            })?
            .collect::<std::result::Result<Vec<_>, _>>()?;
        if columns.is_empty() {
            return Err(Error::TableNotFound(table_name.to_owned()));
        }
        Ok(Table {
            name: table_name.to_owned(),
            columns,
            ..Default::default()
        })
    }

    pub fn row_count(&self, table_name: &str) -> Result<u64> {
        let sql = format!("SELECT count(*) FROM {}", quote_ident(table_name));
        let count: i64 = self.conn.query_row(&sql, [], |row| row.get(0))?;
        Ok(u64::try_from(count).unwrap_or(0))
    }

    /// Reads `limit` rows starting at `offset`, in storage order (Data view).
    pub fn rows(&self, table_name: &str, offset: u64, limit: u64) -> Result<RowSet> {
        let table = self.table(table_name)?;
        let select_list = table
            .columns
            .iter()
            .map(|c| sql::json_friendly_select(&c.name, c.data_type))
            .collect::<Vec<_>>()
            .join(", ");
        let sql = format!(
            "SELECT {select_list} FROM {} LIMIT {limit} OFFSET {offset}",
            quote_ident(table_name)
        );
        let mut stmt = self.conn.prepare(&sql)?;
        let width = table.columns.len();
        let rows = stmt
            .query_map([], |row| {
                (0..width)
                    .map(|i| row.get::<_, duckdb::types::Value>(i).map(sql::to_json))
                    .collect()
            })?
            .collect::<std::result::Result<Vec<Vec<_>>, _>>()?;
        Ok(RowSet {
            total_rows: self.row_count(table_name)?,
            columns: table.columns,
            rows,
        })
    }
}

/// Table name derived from a file name, as Power BI does (`sales 2025.csv` → `sales 2025`).
pub fn table_name_from_path(path: &Path) -> String {
    path.file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Table".into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn table_name_comes_from_file_stem() {
        assert_eq!(
            table_name_from_path(Path::new("/x/sales 2025.csv")),
            "vendas 2025"
        );
    }

    #[test]
    fn unknown_table_is_an_error() {
        let engine = Engine::in_memory().unwrap();
        assert!(matches!(engine.table("Missing"), Err(Error::TableNotFound(_))));
    }
}
