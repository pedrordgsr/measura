# Arquitetura

> Este documento descreve **como** a solução apresentada em [APRESENTACAO.md](APRESENTACAO.md) será construída.
> A apresentação explica *o quê e por quê*; aqui está o *como*.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Núcleo](#2-núcleo)
3. [Interface clássica](#3-interface-clássica)
4. [Camada de IA](#4-camada-de-ia)
5. [Formato do projeto](#5-formato-do-projeto)
6. [Publicação](#6-publicação)
7. [Módulo de migração do Power BI](#7-módulo-de-migração-do-power-bi)
8. [Stack](#8-stack)
9. [Estrutura do repositório](#9-estrutura-do-repositório)
10. [Execução por etapas](#10-execução-por-etapas)
11. [Riscos técnicos](#11-riscos-técnicos)

---

## 1. Visão geral

Um **núcleo único** guarda e processa os dados. Duas experiências ficam por cima dele: a **interface clássica** (estilo Power BI) e o **assistente de IA**. As duas usam exatamente as mesmas operações do núcleo, então tudo o que a IA faz pode ser visto e editado na interface, e o contrário também vale.

```
┌───────────────────────────────┐      ┌────────────────────────────────┐
│ Interface clássica (React)    │      │ Assistente de IA               │
│ dados │ modelo │ relatório │  │      │ chat no app  │  servidor MCP   │
│ editor de consultas           │      │              │ (Claude Code,   │
└───────────────┬───────────────┘      │              │  Claude Desktop)│
                │                      └──────┬───────┴────────┬────────┘
                │                             │                │
┌───────────────▼─────────────────────────────▼────────────────▼────────┐
│ Operações do projeto (API única)                                      │
│ importar │ transformar │ relacionar │ medir │ visualizar │ desfazer   │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
┌───────────────────────────────────▼───────────────────────────────────┐
│ Núcleo (Rust)                                                         │
│ ETL em etapas → DuckDB → modelo semântico → medidas → consultas       │
└───────────────────────────────────────────────────────────────────────┘
```

**Regras de projeto:**

- O núcleo é uma **biblioteca Rust sem interface**. A mesma biblioteca roda no app desktop, no servidor e no navegador (WASM).
- A interface e a IA **nunca escrevem SQL diretamente**. Elas chamam operações do projeto, e o núcleo gera e executa as consultas.
- Todo o projeto é salvo em **arquivos de texto** (ver [seção 5](#5-formato-do-projeto)).
- Toda operação fica registrada num **histórico** e pode ser desfeita.

---

## 2. Núcleo

### 2.1 Armazenamento: DuckDB

O **DuckDB** faz o papel que o VertiPaq tem no Power BI:

- Banco analítico colunar, muito rápido em agregações
- Embutido no app, sem servidor separado
- Lê CSV, Excel, Parquet e JSON, e conecta em Postgres, MySQL e SQLite
- Existe para Rust (`duckdb-rs`) e para o navegador (`duckdb-wasm`)

Os dados importados ficam materializados num arquivo `.duckdb` (ou em Parquet) dentro da pasta de cache do projeto.

### 2.2 ETL em etapas

Cada consulta é uma **lista de etapas** salva em JSON, como as "etapas aplicadas" do Power Query:

```json
{
  "query": "Vendas",
  "steps": [
    { "id": "fonte",   "op": "source.csv", "path": "dados/vendas.csv", "delimiter": ";" },
    { "id": "tipos",   "op": "change_types", "columns": { "Data": "date", "Valor": "decimal" } },
    { "id": "filtrar", "op": "filter", "column": "Valor", "cond": ">", "value": 0 },
    { "id": "remover", "op": "remove_columns", "columns": ["Obs"] }
  ]
}
```

O núcleo **compila as etapas para SQL**, com uma CTE por etapa:

```sql
WITH fonte   AS (SELECT * FROM read_csv('dados/vendas.csv', delim=';')),
     tipos   AS (SELECT CAST(Data AS DATE) AS Data, CAST(Valor AS DECIMAL(18,2)) AS Valor, ... FROM fonte),
     filtrar AS (SELECT * FROM tipos WHERE Valor > 0),
     remover AS (SELECT * EXCLUDE (Obs) FROM filtrar)
SELECT * FROM remover;
```

- **Pré-visualização:** roda sobre uma amostra (ex.: 1.000 linhas) e mostra o resultado até qualquer etapa
- **Carga completa:** acontece só ao aplicar
- **Fontes de banco de dados:** as etapas iniciais são enviadas ao próprio banco (equivalente ao *query folding*)

**Operações iniciais:** fontes (CSV, Excel, Parquet, pasta, bancos SQL); filtrar, ordenar, remover duplicatas; remover, renomear e mudar tipo de colunas; coluna personalizada e condicional; dividir coluna; despivotar; agrupar; mesclar (join) e acrescentar (union).

### 2.3 Modelo semântico

O modelo descreve tabelas, colunas e relações:

```yaml
relationships:
  - from: Vendas[ProdutoId]
    to: Produto[Id]
    cardinality: many_to_one
    cross_filter: single     # single | both
  - from: Vendas[Data]
    to: Calendario[Data]
    cardinality: many_to_one
    cross_filter: single
```

- Cardinalidade (1:1, 1:N, N:N), direção do filtro e relações ativas ou inativas
- Uma tabela marcada como **calendário**, necessária para cálculos com tempo
- Formatos e categorias por coluna (moeda, porcentagem, país...)
- **Sugestão automática de relações** por nome de coluna e por sobreposição de valores

### 2.4 Medidas em SQL

As medidas são escritas em **SQL**, mas se comportam como as do DAX: **respondem aos filtros** do gráfico, dos segmentadores e da página em que aparecem.

```yaml
measures:
  - name: Total Vendas
    table: Vendas
    expr: SUM(Valor)
    format: currency_brl

  - name: Ticket Médio
    expr: "[Total Vendas] / COUNT(DISTINCT Vendas.PedidoId)"
    format: currency_brl

  - name: Total Vendas A-1
    expr: "[Total Vendas]"
    time_shift: { by: year, n: -1 }                  # ≈ SAMEPERIODLASTYEAR
    format: currency_brl

  - name: "% do Total"
    expr: "[Total Vendas] / [Total Vendas]{ignore: Produto}"   # ≈ CALCULATE(..., ALL(Produto))
    format: percent
```

Sobre o SQL comum, a linguagem de medidas acrescenta:

| Recurso | Equivalente no DAX |
|---|---|
| `[Medida]`: referência a outra medida | Referência a medida |
| `{ignore: Tabela}`: remove filtros de uma tabela | `ALL`, `REMOVEFILTERS` |
| `{where: condição}`: adiciona filtro | `CALCULATE` com filtro |
| `time_shift`, `time_to_date` | `SAMEPERIODLASTYEAR`, `DATESYTD` |

O **Malloy** (código aberto) é a principal referência para esse desenho e pode ser usado diretamente se for adequado.

### 2.5 Consultas dos visuais

Todo visual vira uma **QuerySpec**: colunas de agrupamento, medidas e filtros.

```
gráfico: eixo = Produto[Categoria], valores = [Total Vendas], [% do Total]
filtro:  Calendario[Ano] = 2025 (segmentador)
         │
         ▼
QuerySpec { group_by: [Produto[Categoria]], measures: [...], filters: [Calendario[Ano] = 2025] }
         │
         ▼
SQL gerado pelo núcleo:
```

```sql
WITH ctx AS (
  SELECT v.*, p.Categoria
  FROM Vendas v
  JOIN Produto p    ON v.ProdutoId = p.Id
  JOIN Calendario c ON v.Data = c.Data
  WHERE c.Ano = 2025                          -- filtro propagado pela relação
),
total     AS (SELECT Categoria, SUM(Valor) AS v FROM ctx GROUP BY Categoria),
total_all AS (SELECT SUM(Valor) AS v FROM ctx)  -- {ignore: Produto}
SELECT t.Categoria, t.v AS "Total Vendas", t.v / NULLIF(a.v, 0) AS "% do Total"
FROM total t CROSS JOIN total_all a;
```

- Consultas de vários visuais rodam **em paralelo** e são canceladas quando o filtro muda antes do fim
- **Cache** por hash da QuerySpec
- O resultado volta ao frontend em **Apache Arrow**

---

## 3. Interface clássica

| Tela | O que faz | Bibliotecas |
|---|---|---|
| **Visão de dados** | Grade com as tabelas importadas, ordenação e filtro rápido | Glide Data Grid (renderiza em canvas e aguenta milhões de linhas) |
| **Visão de modelo** | Diagrama de tabelas; criar relações arrastando uma coluna até outra | React Flow + ELK.js (layout automático) |
| **Editor de consultas** | Fontes à esquerda, pré-visualização no centro, etapas aplicadas à direita, perfil de colunas | Glide Data Grid |
| **Relatório** | Canvas com páginas, painel de campos, poços de campos, formatação e filtros | react-grid-layout, dnd-kit, ECharts |
| **Editor de medidas** | Realce, autocomplete de tabelas, colunas e medidas, erros inline | Monaco Editor |

### Visuais

Cada visual é salvo como uma spec JSON:

```json
{
  "id": "v1",
  "type": "bar",
  "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
  "fields": { "axis": ["Produto[Categoria]"], "values": ["[Total Vendas]"] },
  "format": { "title": "Vendas por categoria", "dataLabels": true }
}
```

- **Catálogo inicial:** tabela, matriz, cartão, barras/colunas, linhas, área, pizza/rosca, dispersão, segmentador, KPI
- **Interação entre visuais:** clicar numa barra adiciona um filtro à QuerySpec dos outros visuais da página
- **Drill-down** em hierarquias (Ano → Trimestre → Mês)

---

## 4. Camada de IA

### 4.1 Ferramentas

A IA usa as **mesmas operações do projeto** que a interface clássica, expostas como ferramentas:

| Grupo | Ferramentas |
|---|---|
| Descobrir | `list_sources`, `list_tables`, `describe_table` |
| Perfilar | `profile_column` (nulos, distintos, padrões como "3 formatos de data"), `sample_rows` |
| Transformar | `add_etl_step`, `edit_etl_step`, `remove_etl_step`, `preview_query` |
| Modelar | `suggest_relationships`, `create_relationship` |
| Medir | `create_measure`, `edit_measure`, `explain_measure`, `run_query` |
| Visualizar | `create_visual`, `edit_visual`, `create_page`, `screenshot_page` |
| Projeto | `get_project_state`, `history`, `undo` |

### 4.2 Duas formas de acesso

- **Chat no app:** um loop de *tool use* com provedor configurável (Claude via API com a chave do usuário, ou um modelo local via Ollama). O app monta o contexto enviado: esquema, perfis de coluna, relações, medidas e a página atual.
- **Servidor MCP:** as mesmas ferramentas expostas via Model Context Protocol (stdio no desktop, HTTP no servidor). Quem usa o Claude Code ou o Claude Desktop controla o app de fora e vê o projeto mudando em tempo real.

### 4.3 Confiança: a IA propõe, o app valida

```
pedido do usuário
      │
      ▼
IA chama ferramentas ──► núcleo executa numa amostra
      │                        │
      │                        ▼
      │                 checagens automáticas
      │                 (join que multiplica linhas, nulos inesperados,
      │                  total diferente da soma das partes, erro de tipo)
      ▼                        │
proposta pendente ◄────────────┘
(diff do projeto + diff dos números)
      │
      ▼
usuário aceita, ajusta ou recusa ──► histórico (pode desfazer)
```

- **Proveniência:** todo número no relatório mostra as etapas, as medidas e o SQL de onde veio
- **Testes de medida:** asserções como "Total Vendas de jan/2025 = 1.234.567", executadas a cada mudança

### 4.4 Privacidade

| Nível | O que a IA recebe |
|---|---|
| Mínimo | Só o esquema (nomes e tipos de colunas) |
| **Padrão** | Esquema + estatísticas + amostra pequena |
| Completo | Pode executar consultas e ver os resultados |
| Local | Qualquer nível, com o modelo rodando na máquina |

Configurável por projeto e por coluna. Uma coluna marcada como sensível (ex.: CPF) nunca sai da máquina.

---

## 5. Formato do projeto

O projeto é uma **pasta de arquivos de texto**, versionável no git:

```
meu-relatorio/
├── projeto.yaml            # nome, versão do formato
├── fontes/conexoes.yaml    # conexões (senhas ficam no cofre do sistema)
├── consultas/*.steps.json  # etapas de ETL
├── modelo/
│   ├── tabelas.yaml        # colunas, tipos, formatos
│   ├── relacoes.yaml
│   ├── medidas.yaml
│   └── diagrama.json       # posições na visão de modelo
├── relatorio/
│   ├── tema.json
│   └── paginas/*.json      # visuais
├── testes/medidas.yaml     # asserções de medidas
└── .cache/                 # dados materializados (fora do git)
```

Para distribuir, a pasta pode ser empacotada num único arquivo `.zip`.

---

## 6. Publicação

O núcleo roda em três ambientes. O frontend é o mesmo nos três, só que em modo leitura na publicação.

| Modo | Como funciona | Para quem |
|---|---|---|
| **Site estático** | Exporta dados em Parquet + modelo + páginas. Roda inteiro no navegador com DuckDB-WASM. Hospeda no GitHub Pages, Netlify ou S3 | Dashboards públicos, portfólio. Sem custo e sem atualização automática |
| **Servidor próprio** | Imagem Docker com API em Axum, Postgres para usuários e workspaces, e um DuckDB por projeto | Empresas |
| **Nuvem hospedada** | O mesmo servidor, operado pelo projeto | Quem não quer manter infraestrutura |

**Recursos do servidor:**

- Workspaces com papéis (admin, editor, visualizador) e botão "Publicar" no desktop
- **Atualização agendada:** reexecuta o ETL em horários definidos
- **Segurança por linha (RLS):** cada papel recebe um filtro aplicado a toda consulta (ex.: `Regiao = usuario.regiao`)
- Login local e via OIDC/SAML (Google, Azure AD, Keycloak)
- Incorporação em outros sites (iframe com token)
- **IA no relatório publicado:** quem visualiza pode fazer perguntas, sempre respeitando a RLS

---

## 7. Módulo de migração do Power BI

Fica para a última etapa e serve para trazer projetos existentes.

- **Importar PBIP/TMDL:** o formato de projeto em texto do Power BI. Traz tabelas, relações, layout dos visuais e consultas
- **Tradutor DAX → medidas SQL:**
  - Parser de DAX (Pratt, escrito à mão em Rust)
  - Tradução determinística do subconjunto comum: `SUM`, `CALCULATE`, `ALL`, `FILTER`, `DIVIDE`, `VAR`, funções de tempo
  - O que o tradutor não cobre vai para a IA, com revisão obrigatória do usuário
  - Validação: compara os resultados da medida traduzida com os valores salvos do Power BI
- **Tradutor M → etapas:** mesma estratégia, para as transformações mais comuns

---

## 8. Stack

| Camada | Tecnologia |
|---|---|
| Núcleo | **Rust** |
| Banco de dados | **DuckDB** (`duckdb-rs`, `duckdb-wasm`) |
| Transporte de dados | **Apache Arrow** |
| App desktop | **Tauri 2** |
| Servidor | **Axum** + **Tokio** + **Postgres** (`sqlx`) + Docker |
| Frontend | **React** + **TypeScript** + **Vite** + **Zustand** |
| UI base | **Radix UI** + **Tailwind CSS** |
| Gráficos | **Apache ECharts** |
| Canvas do relatório | **react-grid-layout** + **dnd-kit** |
| Grades | **Glide Data Grid** |
| Diagrama do modelo | **React Flow** + **ELK.js** |
| Editor de código | **Monaco Editor** |
| IA | **MCP** (servidor) + tool use com provedores plugáveis |
| Testes | `cargo test`, **Vitest**, **Playwright** |

---

## 9. Estrutura do repositório

```
projeto/
├── crates/
│   ├── core/        # formato do projeto, modelo, histórico de operações
│   ├── etl/         # etapas → SQL, conectores
│   ├── semantic/    # medidas, propagação de filtros, QuerySpec → SQL
│   ├── engine/      # execução no DuckDB, cache, paralelismo
│   ├── tools/       # operações expostas à IA (esquemas + validação)
│   ├── mcp/         # servidor MCP
│   ├── server/      # API de publicação, auth, agendador
│   ├── wasm/        # bindings para o navegador
│   └── migrate/     # importação PBIP, tradutores DAX e M
├── apps/
│   ├── desktop/     # Tauri
│   └── web/         # visualizador (servidor e site estático)
├── packages/
│   ├── ui/          # componentes compartilhados
│   ├── visuals/     # spec → ECharts
│   └── editor/      # Monaco com a linguagem de medidas
└── docs/
```

---

## 10. Execução por etapas

As etapas são as mesmas da apresentação, aqui com as entregas técnicas de cada uma.

| Etapa | Entregas técnicas | Critério de pronto |
|---|---|---|
| **1. Base** | Monorepo; crates `core`, `etl` (só fontes) e `engine`; app Tauri; formato do projeto; visão de dados; visão de modelo com relações e sugestão automática | Abrir CSV/Excel, ver os dados, criar relações, salvar e reabrir o projeto |
| **2. Relatórios** | QuerySpec → SQL com propagação de filtros; canvas, painel de campos, ECharts; tabela, barras, linhas, cartão e segmentador; interação entre visuais; agregação implícita (soma de coluna) | **Primeiro dashboard** com filtros que funcionam entre os visuais |
| **3. IA via MCP** | Crate `tools` com as operações da seção 4.1; crate `mcp`; histórico com desfazer; app atualiza em tempo real quando o projeto muda | Pedir ao Claude Code "cria uma página de vendas por região" e ver a página surgir no app |
| **4. Limpeza de dados** | Editor de consultas com etapas e pré-visualização; perfil de colunas; chat interno; propostas pendentes com diff; checagens automáticas | Limpar um conjunto de planilhas bagunçadas pedindo ao assistente e revisando as etapas |
| **5. Cálculos** | Linguagem de medidas (seção 2.4) com `ignore`, `where` e funções de tempo; editor Monaco; testes de medida; criação de medidas por descrição | Ticket médio, % do total e variação contra o ano anterior corretos e testados |
| **6. Publicar** | Crate `wasm`; app `web`; exportação para site estático | Relatório publicado no GitHub Pages e acessível por link |
| **7. Servidor** | Crate `server`; imagem Docker; workspaces; publicar do desktop; atualização agendada; RLS; login OIDC | Empresa sobe com `docker run`, publica um relatório e restringe dados por usuário |
| **8. Migração** | Crate `migrate`; importação PBIP; tradutores DAX e M com validação | Projeto Power BI de exemplo (ex.: AdventureWorks) importado com as medidas batendo |

**Meta inicial (etapas 1 a 3):** demonstrar a proposta inteira, que é abrir dados, montar um dashboard e pedir ao Claude para criar uma página.

---

## 11. Riscos técnicos

| Risco | Mitigação |
|---|---|
| Propagação de filtros e medidas com resultados errados | Testes com bases conhecidas (AdventureWorks, Contoso) comparados a valores de referência; testes de medida no próprio projeto |
| IA gera números plausíveis mas errados | Execução obrigatória, checagens automáticas, propostas pendentes com diff, proveniência visível |
| Desempenho com bases grandes | DuckDB + cache + consultas em paralelo; medir desde cedo com bases de 10M+ linhas |
| Escopo grande para uma equipe pequena | Etapas com entregas usáveis; núcleo bem separado para facilitar contribuições |
| Linguagem de medidas própria não pega | Avaliar o Malloy antes de criar uma linguagem do zero; manter a sintaxe próxima do SQL |
| Questões de marca | Não usar nome nem identidade visual da Microsoft; implementar a partir de documentação pública |
