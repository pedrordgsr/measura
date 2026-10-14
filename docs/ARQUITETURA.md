# Arquitetura: clone do Power BI Desktop

> Este documento descreve **como** a solução apresentada em [APRESENTACAO.md](APRESENTACAO.md) será construída.
> A apresentação explica *o quê e por quê*; aqui está o *como*.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Motor de armazenamento](#2-motor-de-armazenamento)
3. [Power Query e linguagem M](#3-power-query-e-linguagem-m)
4. [Modelo semântico](#4-modelo-semântico)
5. [Motor de DAX](#5-motor-de-dax)
6. [Interface](#6-interface)
7. [Formato do projeto](#7-formato-do-projeto)
8. [Publicação](#8-publicação)
9. [Stack](#9-stack)
10. [Estrutura do repositório](#10-estrutura-do-repositório)
11. [Execução por etapas](#11-execução-por-etapas)
12. [Riscos técnicos](#12-riscos-técnicos)

---

## 1. Visão geral

A arquitetura segue a mesma divisão interna do Power BI:

| No Power BI | Neste projeto |
|---|---|
| Mashup engine (Power Query / M) | Interpretador de M que compila para SQL |
| VertiPaq (storage engine) | **DuckDB** |
| Formula engine (DAX) | Motor de DAX em **Rust** |
| Interface do Power BI Desktop | **React** dentro do **Tauri** |

A ideia central é que **todo visual é uma consulta DAX**. Um gráfico com `Produto[Categoria]` no eixo e `[Total Vendas]` nos valores, filtrado por um segmentador de ano, gera internamente:

```dax
EVALUATE
SUMMARIZECOLUMNS(
    Produto[Categoria],
    TREATAS({2025}, Calendario[Ano]),
    "Total Vendas", [Total Vendas]
)
```

O Power BI faz exatamente isso. Com essa escolha, o motor de DAX atende tanto as medidas quanto os visuais.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Interface (React + Tauri)                                            │
│ Relatório │ Dados │ Modelo │ Editor do Power Query                   │
└──────────────┬──────────────────────────────────────┬────────────────┘
               │ consulta DAX gerada pelo visual       │ código M
┌──────────────▼──────────────────────┐  ┌─────────────▼───────────────┐
│ Motor de DAX (formula engine)       │  │ Motor de M (mashup)         │
│ parser → plano → SQL + avaliador    │  │ parser → etapas → SQL       │
└──────────────┬──────────────────────┘  └─────────────┬───────────────┘
               │ SQL                                   │ carga
┌──────────────▼───────────────────────────────────────▼───────────────┐
│ DuckDB (storage engine)                                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Regras de projeto:**

- O núcleo (M, DAX, modelo, execução) é uma **biblioteca Rust sem interface**. A mesma biblioteca roda no desktop, no servidor e no navegador (WASM).
- A interface nunca gera SQL. Ela gera **DAX e M**, como o Power BI.
- O projeto é salvo em **PBIP/TMDL** (ver [seção 7](#7-formato-do-projeto)).

---

## 2. Motor de armazenamento

O **DuckDB** substitui o VertiPaq:

- Banco analítico colunar e vetorizado, muito rápido em agregações
- Embutido no app, sem servidor separado
- Lê CSV, Excel, Parquet e JSON e conecta em Postgres, MySQL, SQL Server e SQLite
- Versões para Rust (`duckdb-rs`) e para o navegador (`duckdb-wasm`)

| Modo do Power BI | Implementação |
|---|---|
| **Importação** | Tabelas carregadas num arquivo `.duckdb` na pasta de cache do projeto |
| **DirectQuery** | SQL enviado à fonte original. Fase posterior |
| **Dual / Composite** | Fora do escopo inicial |

---

## 3. Power Query e linguagem M

### 3.1 Como funciona

Como no Power BI, **cada clique na interface gera uma etapa em M**:

```m
let
    Fonte = Csv.Document(File.Contents("dados/vendas.csv"), [Delimiter=";", Encoding=65001]),
    #"Cabeçalhos Promovidos" = Table.PromoteHeaders(Fonte, [PromoteAllScalars=true]),
    #"Tipo Alterado" = Table.TransformColumnTypes(#"Cabeçalhos Promovidos",
        {{"Data", type date}, {"Valor", type number}}),
    #"Linhas Filtradas" = Table.SelectRows(#"Tipo Alterado", each [Valor] > 0),
    #"Colunas Removidas" = Table.RemoveColumns(#"Linhas Filtradas", {"Obs"})
in
    #"Colunas Removidas"
```

- Cada variável do `let` aparece no painel **Etapas Aplicadas**
- A engrenagem de cada etapa reabre o diálogo que a gerou
- O **Editor Avançado** mostra e permite editar o M diretamente
- A barra de fórmulas mostra o M da etapa selecionada

### 3.2 Execução

```
código M ──► parser ──► AST ──► reconhecedor de funções Table.* ──► etapas tipadas ──► SQL DuckDB
                                        │
                                        └─ expressões não reconhecidas ──► interpretador M (linha a linha)
```

- **Caso comum:** as funções `Table.*` viram CTEs em SQL, o equivalente ao *query folding*
- **Fontes de banco de dados:** as etapas iniciais são enviadas ao próprio banco
- **Expressões `each` simples** (`[Valor] > 0`, `Text.Upper([Nome])`) são traduzidas para SQL
- **Casos complexos** (funções personalizadas, `List.Accumulate`, recursão) vão para um interpretador M em Rust, que é mais lento mas correto
- A pré-visualização roda numa amostra; **Fechar e Aplicar** faz a carga completa

### 3.3 Funções por fase

| Fase | Funções |
|---|---|
| **v1** | Fontes: `Csv.Document`, `Excel.Workbook`, `Parquet.Document`, `Folder.Files`, `Sql.Database`, `PostgreSQL.Database`. Tabela: `PromoteHeaders`, `TransformColumnTypes`, `SelectRows`, `RemoveColumns`, `SelectColumns`, `RenameColumns`, `ReorderColumns`, `Distinct`, `Sort`, `FirstN`, `AddColumn`, `ReplaceValue` |
| **v2** | `NestedJoin` + `ExpandTableColumn` (mesclar), `Combine` (acrescentar), `Group`, `UnpivotOtherColumns`, `Pivot`, `SplitColumn`, `TransformColumns`, `FillDown`, `Transpose`. Funções `Text.*`, `Date.*`, `Number.*` mais usadas |
| **v3** | Parâmetros, funções personalizadas, `List.*`, `Record.*`, `Web.Contents`, `Json.Document`, combinar arquivos de pasta |

### 3.4 Interface do editor

- Painel de consultas à esquerda, grade de pré-visualização no centro, **Configurações de Consulta** e **Etapas Aplicadas** à direita
- Faixa de opções com as abas Página Inicial, Transformar, Adicionar Coluna e Exibição
- **Qualidade, distribuição e perfil de coluna** abaixo dos cabeçalhos
- Ícone de tipo no cabeçalho de cada coluna, que também serve para mudar o tipo

---

## 4. Modelo semântico

O modelo segue os conceitos do Power BI, sem adaptações:

- **Relações:** cardinalidade (1:1, 1:N, N:1, N:N), direção do filtro cruzado (única ou ambas) e relações ativas ou inativas
- **Tabela de datas:** "Marcar como tabela de datas"
- **Colunas calculadas:** DAX avaliado linha a linha na carga e materializado
- **Tabelas calculadas:** DAX que retorna tabela (`CALENDAR`, `SUMMARIZE`, etc.)
- **Hierarquias**, **pastas de exibição**, **classificar por coluna**, **ocultar** colunas e tabelas
- **Formato** e **categoria de dados** (moeda, porcentagem, país, URL da imagem...)
- **Funções (roles) de RLS** com filtros DAX
- **Detecção automática de relações** ao carregar, como a opção do Power BI

---

## 5. Motor de DAX

É o componente mais crítico. O objetivo é **produzir os mesmos resultados que o Power BI**.

### 5.1 Conceitos que o motor implementa

| Conceito | Comportamento |
|---|---|
| **Contexto de filtro** | Conjunto de filtros por coluna vindo do visual, dos segmentadores, dos filtros de página e relatório e do `CALCULATE` |
| **Propagação** | Filtros seguem as relações do lado 1 para o lado N (ou nos dois sentidos, se configurado) |
| **Contexto de linha** | Criado por iteradores (`SUMX`, `FILTER`, `ADDCOLUMNS`) e colunas calculadas |
| **Transição de contexto** | `CALCULATE` e toda referência a medida transformam o contexto de linha em contexto de filtro |
| **Modificadores** | `ALL`, `ALLEXCEPT`, `REMOVEFILTERS`, `KEEPFILTERS`, `USERELATIONSHIP`, `CROSSFILTER` |
| **BLANK** | Semântica própria (`BLANK() + 1 = 1`, `BLANK() = 0` é verdadeiro), diferente do NULL do SQL |
| **Auto-exist** | Combinações de colunas da mesma tabela que não existem nos dados são omitidas |
| **Linha em branco** | Linha virtual adicionada ao lado 1 quando há valores sem correspondência no lado N |

### 5.2 Pipeline

O motor imita a divisão do Power BI entre formula engine e storage engine:

```
texto DAX
   │  lexer + parser (Pratt, escrito à mão, com mensagens de erro em português)
   ▼
AST ──► resolução de nomes e tipos (tabelas, colunas, medidas, variáveis)
   │
   ▼
plano lógico (Scan, Filter, Join, Aggregate, SetFilterContext, Iterate, ...)
   │
   ├──► compilador SQL ──► DuckDB         (storage engine: agregações em massa)
   └──► avaliador Rust                    (formula engine: iteradores, transição de
                                           contexto, lógica que não vira SQL simples)
```

O objetivo do otimizador é empurrar o máximo possível para o DuckDB, como o Power BI faz com o VertiPaq.

### 5.3 Exemplo de compilação

```dax
Total Vendas = SUM(Vendas[Valor])
% do Total   = DIVIDE([Total Vendas], CALCULATE([Total Vendas], ALL(Produto)))
```

Visual: `Produto[Categoria]` com as duas medidas, segmentador `Calendario[Ano] = 2025`.

```sql
WITH ctx AS (
  SELECT v.*, p.Categoria
  FROM Vendas v
  JOIN Produto p    ON v.ProdutoId = p.Id
  JOIN Calendario c ON v.Data = c.Data
  WHERE c.Ano = 2025                            -- filtro propagado pela relação
),
total     AS (SELECT Categoria, SUM(Valor) AS v FROM ctx GROUP BY Categoria),
total_all AS (SELECT SUM(Valor) AS v FROM ctx)  -- ALL(Produto): remove só os filtros de Produto
SELECT t.Categoria,
       t.v                                      AS "Total Vendas",
       CASE WHEN a.v = 0 THEN NULL ELSE t.v / a.v END AS "% do Total"   -- DIVIDE → BLANK
FROM total t CROSS JOIN total_all a;
```

### 5.4 Funções por fase

| Fase | Funções |
|---|---|
| **DAX essencial** (etapa 3) | `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `COUNTA`, `COUNTROWS`, `DISTINCTCOUNT`, `CALCULATE`, `ALL`, `REMOVEFILTERS`, `FILTER`, `DIVIDE`, `IF`, `SWITCH`, `AND`, `OR`, `NOT`, `BLANK`, `ISBLANK`, `VAR/RETURN`, operadores |
| **DAX do dia a dia** (etapa 5) | `SUMX`, `AVERAGEX`, `COUNTX`, `MAXX`, `MINX`, `RELATED`, `RELATEDTABLE`, `VALUES`, `DISTINCT`, `SELECTEDVALUE`, `HASONEVALUE`, `ISFILTERED`, `ALLEXCEPT`, `ALLSELECTED`, `KEEPFILTERS`, `USERELATIONSHIP`, `CALENDAR`, `CALENDARAUTO`, inteligência de tempo (`TOTALYTD`, `DATESYTD`, `SAMEPERIODLASTYEAR`, `DATEADD`, `PARALLELPERIOD`, `DATESINPERIOD`), funções de texto e data |
| **DAX avançado** (após etapa 8) | `SUMMARIZE`, `SUMMARIZECOLUMNS`, `ADDCOLUMNS`, `SELECTCOLUMNS`, `TOPN`, `RANKX`, `GENERATE`, `CROSSJOIN`, `TREATAS`, `CROSSFILTER`, `EARLIER`, `PATH*`, consultas `EVALUATE` livres |

### 5.5 Conformidade com o Power BI

- **Suíte de conformidade:** conjuntos (modelo + medida + contexto de filtro → resultado esperado), com os resultados esperados gerados no **Power BI real** sobre bases públicas (AdventureWorks, Contoso)
- Executada em cada mudança (CI). A cobertura é publicada como uma **matriz de compatibilidade** por função
- Referências: [dax.guide](https://dax.guide), documentação oficial da Microsoft e *The Definitive Guide to DAX* (SQLBI)
- Testes cruzados: o mesmo DAX avaliado pelo compilador SQL e pelo avaliador Rust deve dar o mesmo resultado

---

## 6. Interface

O objetivo é que um usuário de Power BI **encontre tudo onde espera**.

### 6.1 Estrutura da janela

```
┌──────────────────────────────────────────────────────────────────────┐
│ Faixa de opções: Página Inicial │ Inserir │ Modelagem │ Exibição │ Ajuda│
├──┬─────────────────────────────────────────┬──────────┬──────────────┤
│▣ │                                         │ Filtros  │Visualizações │
│▦ │          Canvas do relatório            │          │ [tipos]      │
│◫ │                                         │          │ [poços]      │
│  │                                         │          │──────────────│
│  │                                         │          │ Dados        │
│  │                                         │          │ (campos)     │
├──┴─────────────────────────────────────────┴──────────┴──────────────┤
│ Página 1 │ Página 2 │ +                                              │
└──────────────────────────────────────────────────────────────────────┘
  ▣ Relatório   ▦ Dados   ◫ Modelo
```

### 6.2 Exibições

| Exibição | O que faz | Bibliotecas |
|---|---|---|
| **Relatório** | Canvas com páginas, painéis de Visualizações, Dados, Filtros e Formatação | react-grid-layout, dnd-kit, ECharts |
| **Dados** | Grade da tabela selecionada; barra de fórmulas para colunas calculadas e medidas | Glide Data Grid, Monaco |
| **Modelo** | Diagrama de tabelas e relações; painel de propriedades; layouts múltiplos | React Flow + ELK.js |
| **Editor do Power Query** | Janela separada (ver [seção 3.4](#34-interface-do-editor)) | Glide Data Grid, Monaco |

### 6.3 Visuais

**Catálogo:** tabela, matriz, cartão, cartão de várias linhas, colunas e barras (clusterizadas, empilhadas, 100%), linhas, área, linhas e colunas combinadas, pizza, rosca, dispersão, treemap, cascata, funil, medidor, KPI, mapa, segmentador (lista, suspenso, entre datas, botões).

**Comportamentos a reproduzir:**

- **Poços de campos** com os mesmos nomes (Eixo X, Eixo Y, Legenda, Valores, Dicas de ferramenta, Linhas, Colunas)
- **Agregação implícita** ao arrastar coluna numérica (Soma, Média, Contagem...)
- **Filtragem cruzada e realce**, com "Editar interações"
- **Drill-down / drill-up** em hierarquias e **Detalhamento** (drill-through) para outra página
- **Totais e subtotais** na matriz, com a mesma lógica de avaliação do Power BI (total = medida avaliada no contexto do total, não soma das linhas)
- **Dicas de ferramenta**, **formatação condicional** e **indicadores** (bookmarks)
- **Temas JSON** no mesmo formato do Power BI

### 6.4 Atalhos e terminologia

- Mesmos nomes de menus, painéis e opções que o Power BI em português
- Atalhos de teclado equivalentes onde fizer sentido (`Ctrl+C`/`Ctrl+V` de visuais, `Ctrl+clique` para seleção múltipla, `Alt` para navegação na faixa)
- Nome, ícones e identidade visual **próprios**: o fluxo é familiar, a marca não é copiada

---

## 7. Formato do projeto

O projeto usa o **PBIP**, formato de projeto em texto do Power BI:

```
MeuRelatorio/
├── MeuRelatorio.pbip
├── MeuRelatorio.SemanticModel/
│   └── definition/
│       ├── model.tmdl
│       ├── relationships.tmdl
│       ├── tables/
│       │   ├── Vendas.tmdl          # colunas, medidas DAX, partição com o código M
│       │   └── Produto.tmdl
│       └── roles/
│           └── Gerente Regional.tmdl # RLS
├── MeuRelatorio.Report/
│   └── definition/                   # páginas e visuais (PBIR)
└── .cache/                           # dados carregados (fora do git)
```

**Exemplo de TMDL:**

```tmdl
table Vendas

    measure 'Total Vendas' = SUM(Vendas[Valor])
        formatString: "R$ #,##0.00"

    column Valor
        dataType: decimal
        sourceColumn: Valor

    partition Vendas = m
        mode: import
        source =
            let
                Fonte = Csv.Document(File.Contents("dados/vendas.csv"), [Delimiter=";"]),
                ...
            in
                #"Colunas Removidas"
```

- **TMDL** (modelo) é documentado publicamente pela Microsoft e é o alvo principal de compatibilidade
- **PBIR** (relatório) é lido na importação. Visuais não suportados aparecem como um espaço reservado com aviso, sem quebrar o relatório
- **`.pbix`:** fora do escopo inicial (binário e não documentado). A recomendação é salvar como PBIP no Power BI e abrir aqui
- Projetos ficam versionáveis no git e podem ser **abertos nas duas ferramentas**, dentro do que for suportado

---

## 8. Publicação

O núcleo roda em três ambientes, e o frontend é o mesmo em todos (em modo leitura na publicação).

| Modo | Como funciona | Equivalente no Power BI |
|---|---|---|
| **Site estático** | Exporta os dados em Parquet + modelo + relatório. Roda no navegador com DuckDB-WASM e o motor DAX em WASM. Hospeda no GitHub Pages, Netlify ou S3 | "Publicar na Web" |
| **Servidor próprio** | Imagem Docker: API em Axum, Postgres para metadados, DuckDB por modelo semântico | Power BI Report Server |
| **Nuvem hospedada** | O mesmo servidor, operado pelo projeto | Serviço do Power BI |

**Recursos do servidor**, com os conceitos do serviço do Power BI:

- **Workspaces** com funções (Administrador, Membro, Colaborador, Visualizador)
- **Publicar** a partir do desktop
- **Atualização agendada** do modelo semântico
- **RLS** usando as funções definidas no modelo, com `USERPRINCIPALNAME()` retornando o usuário logado
- **Aplicativos** (coleções de relatórios para distribuir a usuários finais)
- **Assinaturas** por e-mail (PDF/PNG) e **incorporação** via iframe com token
- Login local e via OIDC/SAML (Azure AD/Entra ID, Google, Keycloak)
- **Gateway** (fase futura): agente na rede do cliente para acessar bancos internos

---

## 9. Stack

| Camada | Tecnologia |
|---|---|
| Núcleo (DAX, M, modelo) | **Rust** |
| Armazenamento | **DuckDB** (`duckdb-rs`, `duckdb-wasm`) |
| Transporte de dados | **Apache Arrow** |
| App desktop | **Tauri 2** |
| Servidor | **Axum** + **Tokio** + **Postgres** (`sqlx`) + Docker |
| Frontend | **React** + **TypeScript** + **Vite** + **Zustand** |
| UI base | **Radix UI** + **Tailwind CSS** |
| Gráficos | **Apache ECharts** |
| Canvas do relatório | **react-grid-layout** + **dnd-kit** |
| Grades | **Glide Data Grid** |
| Diagrama do modelo | **React Flow** + **ELK.js** |
| Editor DAX e M | **Monaco Editor** |
| Testes | `cargo test`, **Vitest**, **Playwright**, suíte de conformidade DAX |

---

## 10. Estrutura do repositório

```
projeto/
├── crates/
│   ├── model/        # modelo semântico, leitura e escrita de TMDL
│   ├── mquery/       # parser e interpretador de M, compilação para SQL, conectores
│   ├── dax/          # lexer, parser, plano lógico, compilador SQL, avaliador
│   ├── engine/       # execução no DuckDB, cache, paralelismo
│   ├── report/       # leitura e escrita de PBIR, consultas dos visuais
│   ├── server/       # API de publicação, workspaces, RLS, agendador
│   └── wasm/         # bindings para o navegador
├── apps/
│   ├── desktop/      # Tauri
│   └── web/          # visualizador (servidor e site estático)
├── packages/
│   ├── ui/           # faixa de opções, painéis, componentes
│   ├── visuals/      # visuais → ECharts
│   └── editors/      # Monaco com DAX e M (realce, autocomplete, erros)
├── tests/
│   ├── dax-conformance/   # resultados esperados gerados no Power BI
│   └── m-conformance/
└── docs/
    └── compatibilidade.md # matriz pública de funções suportadas
```

---

## 11. Execução por etapas

As etapas são as mesmas da apresentação, aqui com as entregas técnicas de cada uma.

| Etapa | Entregas técnicas | Critério de pronto |
|---|---|---|
| **1. Base** | Monorepo; crates `model` e `engine`; conectores CSV/Excel; app Tauri com faixa de opções e as três exibições; exibição de dados; exibição de modelo com relações e detecção automática; salvar e abrir em TMDL | Importar planilhas, ver os dados, relacionar tabelas, salvar e reabrir |
| **2. Relatórios** | Canvas com páginas; painéis Visualizações, Dados e Filtros; tabela, matriz, cartão, colunas, barras, linhas, pizza e segmentador; agregação implícita; filtragem cruzada | **Primeiro relatório** com segmentadores e filtragem cruzada funcionando |
| **3. DAX essencial** | Crate `dax`: parser, propagação de filtros, compilação SQL, funções da fase "essencial"; barra de fórmulas com Monaco; suíte de conformidade inicial | Medidas como `% do Total` com `CALCULATE` + `ALL` batendo com o Power BI |
| **4. Power Query** | Crate `mquery`: parser M, funções v1 e v2; janela do editor com Etapas Aplicadas, Editor Avançado e perfil de coluna; Fechar e Aplicar | Limpar uma planilha bagunçada só com cliques e ver o M gerado |
| **5. DAX completo do dia a dia** | Iteradores, contexto de linha, transição de contexto, colunas e tabelas calculadas, inteligência de tempo; avaliador Rust; matriz com totais corretos | Relatório típico de vendas (YTD, ano anterior, ranking) idêntico ao Power BI |
| **6. Abrir projetos do Power BI** | Leitura completa de PBIP (TMDL + PBIR); temas; espaço reservado para visuais não suportados; relatório de compatibilidade na abertura | Abrir o AdventureWorks salvo como PBIP no Power BI e ver as mesmas medidas e páginas |
| **7. Publicar** | Crate `wasm` (DAX + DuckDB no navegador); app `web`; exportação estática | Relatório publicado no GitHub Pages, com filtros funcionando |
| **8. Servidor** | Crate `server`; Docker; workspaces e funções; publicar do desktop; atualização agendada; RLS; OIDC | Empresa sobe com `docker run`, publica e restringe dados por usuário via RLS |

**Depois da etapa 8:** DAX avançado, M v3, DirectQuery, gateway, formatação condicional completa, indicadores e visuais restantes, sempre priorizados pela matriz de compatibilidade e pelo pedido dos usuários.

---

## 12. Riscos técnicos

| Risco | Mitigação |
|---|---|
| Resultados de DAX diferentes do Power BI | Suíte de conformidade com resultados gerados no Power BI real, executada em cada mudança |
| Casos especiais do DAX (BLANK, auto-exist, totais da matriz) | Tratados como requisitos explícitos desde a etapa 3, com testes específicos |
| M tem centenas de funções | Priorizar as `Table.*` geradas pela interface; interpretador como fallback; matriz pública do que é suportado |
| Desempenho inferior ao VertiPaq | Máximo de trabalho empurrado para o DuckDB; cache; consultas em paralelo; medição com bases de 10M+ linhas |
| Mudanças nos formatos PBIP/PBIR pela Microsoft | Camada de leitura isolada no crate `report`/`model`, versionada; testes com arquivos de várias versões do Power BI |
| Escopo enorme para uma equipe pequena | Etapas com entregas usáveis; matriz de compatibilidade orienta prioridades e contribuições |
| Questões de marca e propriedade intelectual | Nome, ícones e visual próprios; implementação a partir de documentação pública, sem engenharia reversa de código da Microsoft |
