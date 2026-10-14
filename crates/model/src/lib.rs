//! Semantic model: the Rust equivalent of a Power BI dataset.
//!
//! Names and enums follow TMDL (`dataType: int64`, `crossFilteringBehavior: bothDirections`, ...)
//! so that reading/writing PBIP projects is a direct mapping. See `docs/ARQUITETURA.md`, section 4.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Model {
    pub tables: Vec<Table>,
    pub relationships: Vec<Relationship>,
}

impl Model {
    pub fn table(&self, name: &str) -> Option<&Table> {
        self.tables
            .iter()
            .find(|t| t.name.eq_ignore_ascii_case(name))
    }
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Table {
    pub name: String,
    pub columns: Vec<Column>,
    pub measures: Vec<Measure>,
    /// Power Query (M) expression that loads the table. `None` for calculated tables.
    pub source: Option<String>,
    pub is_hidden: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Column {
    pub name: String,
    pub data_type: DataType,
    /// Column name in the loaded data. `None` for calculated columns.
    pub source_column: Option<String>,
    /// DAX expression for calculated columns.
    pub expression: Option<String>,
    pub format_string: Option<String>,
    pub is_hidden: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Measure {
    pub name: String,
    pub expression: String,
    pub format_string: Option<String>,
    pub display_folder: Option<String>,
}

/// Same set and spelling as TMDL `dataType`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DataType {
    String,
    Int64,
    Double,
    Decimal,
    DateTime,
    Boolean,
    Binary,
    Variant,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Relationship {
    pub from_table: String,
    pub from_column: String,
    pub to_table: String,
    pub to_column: String,
    pub from_cardinality: Cardinality,
    pub to_cardinality: Cardinality,
    pub cross_filtering_behavior: CrossFilteringBehavior,
    pub is_active: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum Cardinality {
    One,
    Many,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CrossFilteringBehavior {
    OneDirection,
    BothDirections,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn data_type_serializes_with_tmdl_spelling() {
        let json = serde_json::to_string(&DataType::DateTime).unwrap();
        assert_eq!(json, "\"dateTime\"");
    }

    #[test]
    fn table_lookup_is_case_insensitive() {
        let model = Model {
            tables: vec![Table {
                name: "Vendas".into(),
                ..Default::default()
            }],
            ..Default::default()
        };
        assert!(model.table("vendas").is_some());
    }
}
