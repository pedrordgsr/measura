# Compatibility matrix

What already works the same as in Power BI. Update it with every function or feature implemented.

**Legend:** ✅ same as Power BI (with conformance tests) · 🟡 partial (see note) · ❌ not yet

## Data sources

| Source | Status | Note |
|---|---|---|
| Text/CSV | 🟡 | Delimiter and types detected automatically; no options dialog |
| Excel | ❌ | |
| Parquet | ❌ | |
| Folder | ❌ | |
| SQL Server / PostgreSQL | ❌ | |

## DAX: essential phase (stage 3)

| Function | Status | Note |
|---|---|---|
| `SUM`, `AVERAGE`, `MIN`, `MAX` | ❌ | |
| `COUNT`, `COUNTA`, `COUNTROWS`, `DISTINCTCOUNT` | ❌ | |
| `CALCULATE` | ❌ | |
| `ALL`, `REMOVEFILTERS` | ❌ | |
| `FILTER` | ❌ | |
| `DIVIDE` | ❌ | |
| `IF`, `SWITCH`, `AND`, `OR`, `NOT` | ❌ | |
| `BLANK`, `ISBLANK` | ❌ | |
| `VAR` / `RETURN` | ❌ | |
| Operators (`+ - * / ^ & = <> < > <= >= && \|\| IN`) | ❌ | |

## Power Query (M): v1 (stage 4)

| Function | Status | Note |
|---|---|---|
| `Csv.Document`, `Excel.Workbook`, `Parquet.Document` | ❌ | |
| `Table.PromoteHeaders`, `Table.TransformColumnTypes` | ❌ | |
| `Table.SelectRows`, `Table.RemoveColumns`, `Table.SelectColumns` | ❌ | |
| `Table.RenameColumns`, `Table.ReorderColumns`, `Table.Sort` | ❌ | |
| `Table.Distinct`, `Table.FirstN`, `Table.AddColumn`, `Table.ReplaceValue` | ❌ | |

## Visuals (stage 2)

| Visual | Status | Note |
|---|---|---|
| Table, Matrix | ❌ | |
| Card | ❌ | |
| Column / Bar (clustered, stacked) | ❌ | |
| Line | ❌ | |
| Pie | ❌ | |
| Slicer | ❌ | |
