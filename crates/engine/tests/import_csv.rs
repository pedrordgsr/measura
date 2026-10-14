use std::path::PathBuf;

use measura_engine::Engine;
use measura_model::DataType;

fn fixture(name: &str) -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("../../tests/fixtures")
        .join(name)
}

#[test]
fn imports_csv_with_inferred_types() {
    let engine = Engine::in_memory().unwrap();
    let table = engine.import_csv(&fixture("Vendas.csv"), "Vendas").unwrap();

    let types: Vec<_> = table
        .columns
        .iter()
        .map(|c| (c.name.as_str(), c.data_type))
        .collect();
    assert_eq!(
        types,
        [
            ("Data", DataType::DateTime),
            ("ProdutoId", DataType::Int64),
            ("Quantidade", DataType::Int64),
            ("Valor", DataType::Double),
        ]
    );
    assert_eq!(engine.row_count("Vendas").unwrap(), 8);
}

#[test]
fn reads_a_page_of_rows() {
    let engine = Engine::in_memory().unwrap();
    engine
        .import_csv(&fixture("Produto.csv"), "Produto")
        .unwrap();

    let page = engine.rows("Produto", 1, 2).unwrap();
    assert_eq!(page.total_rows, 4);
    assert_eq!(page.rows.len(), 2);
    assert_eq!(page.rows[0][1], "Mouse");
    assert_eq!(page.rows[0][2], "Acessórios");
}
