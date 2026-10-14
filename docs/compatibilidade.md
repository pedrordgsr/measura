# Matriz de compatibilidade

O que já funciona igual ao Power BI. Atualize a cada função ou recurso implementado.

**Legenda:** ✅ igual ao Power BI (com testes de conformidade) · 🟡 parcial (ver nota) · ❌ ainda não

## Fontes de dados

| Fonte | Status | Nota |
|---|---|---|
| Texto/CSV | 🟡 | Delimitador e tipos detectados automaticamente; sem diálogo de opções |
| Excel | ❌ | |
| Parquet | ❌ | |
| Pasta | ❌ | |
| SQL Server / PostgreSQL | ❌ | |

## DAX: fase essencial (etapa 3)

| Função | Status | Nota |
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
| Operadores (`+ - * / ^ & = <> < > <= >= && \|\| IN`) | ❌ | |

## Power Query (M): v1 (etapa 4)

| Função | Status | Nota |
|---|---|---|
| `Csv.Document`, `Excel.Workbook`, `Parquet.Document` | ❌ | |
| `Table.PromoteHeaders`, `Table.TransformColumnTypes` | ❌ | |
| `Table.SelectRows`, `Table.RemoveColumns`, `Table.SelectColumns` | ❌ | |
| `Table.RenameColumns`, `Table.ReorderColumns`, `Table.Sort` | ❌ | |
| `Table.Distinct`, `Table.FirstN`, `Table.AddColumn`, `Table.ReplaceValue` | ❌ | |

## Visuais (etapa 2)

| Visual | Status | Nota |
|---|---|---|
| Tabela, Matriz | ❌ | |
| Cartão | ❌ | |
| Colunas / Barras (clusterizado, empilhado) | ❌ | |
| Linhas | ❌ | |
| Pizza | ❌ | |
| Segmentador | ❌ | |
