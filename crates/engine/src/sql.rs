//! SQL text helpers. Every identifier and literal that reaches DuckDB goes through here.

use duckdb::types::Value;
use measura_model::DataType;

pub fn quote_ident(name: &str) -> String {
    format!("\"{}\"", name.replace('"', "\"\""))
}

pub fn quote_literal(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

pub fn data_type_from_duckdb(duck_type: &str) -> DataType {
    let t = duck_type.to_ascii_uppercase();
    match t.as_str() {
        "BOOLEAN" => DataType::Boolean,
        "TINYINT" | "SMALLINT" | "INTEGER" | "BIGINT" | "HUGEINT" | "UTINYINT" | "USMALLINT"
        | "UINTEGER" | "UBIGINT" => DataType::Int64,
        "FLOAT" | "DOUBLE" => DataType::Double,
        "VARCHAR" => DataType::String,
        "BLOB" => DataType::Binary,
        "DATE" | "TIME" => DataType::DateTime,
        _ if t.starts_with("DECIMAL") => DataType::Decimal,
        _ if t.starts_with("TIMESTAMP") => DataType::DateTime,
        _ => DataType::Variant,
    }
}

/// Integers, floats, booleans and text travel as JSON values; everything else (dates, decimals)
/// is cast to text by DuckDB so the exact value is preserved and formatting stays in the UI.
pub fn json_friendly_select(column: &str, data_type: DataType) -> String {
    let ident = quote_ident(column);
    match data_type {
        DataType::Int64 | DataType::Double | DataType::Boolean | DataType::String => ident,
        _ => format!("CAST({ident} AS VARCHAR) AS {ident}"),
    }
}

pub fn to_json(value: Value) -> serde_json::Value {
    use serde_json::Value as J;
    match value {
        Value::Null => J::Null,
        Value::Boolean(b) => J::Bool(b),
        Value::TinyInt(n) => n.into(),
        Value::SmallInt(n) => n.into(),
        Value::Int(n) => n.into(),
        Value::BigInt(n) => n.into(),
        Value::UTinyInt(n) => n.into(),
        Value::USmallInt(n) => n.into(),
        Value::UInt(n) => n.into(),
        Value::UBigInt(n) => n.into(),
        Value::HugeInt(n) => J::String(n.to_string()),
        Value::Float(f) => serde_json::Number::from_f64(f64::from(f)).map_or(J::Null, J::Number),
        Value::Double(f) => serde_json::Number::from_f64(f).map_or(J::Null, J::Number),
        Value::Text(s) => J::String(s),
        other => J::String(format!("{other:?}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn identifiers_and_literals_are_escaped() {
        assert_eq!(quote_ident(r#"a"b"#), r#""a""b""#);
        assert_eq!(quote_literal("d'água"), "'d''água'");
    }

    #[test]
    fn duckdb_types_map_to_tmdl_types() {
        assert_eq!(data_type_from_duckdb("DECIMAL(18,2)"), DataType::Decimal);
        assert_eq!(
            data_type_from_duckdb("TIMESTAMP WITH TIME ZONE"),
            DataType::DateTime
        );
        assert_eq!(data_type_from_duckdb("BIGINT"), DataType::Int64);
    }
}
