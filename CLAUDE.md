# CLAUDE.md

Clone de código aberto do **Power BI Desktop**, para Windows, macOS e Linux. O público é quem já usa o Power BI: tudo deve funcionar e estar onde essa pessoa espera. **Não há camada de IA no produto.** A versão com IA foi descartada (`docs/descartado/`), então não use nada de lá.

- O quê e por quê: [docs/APRESENTACAO.md](docs/APRESENTACAO.md)
- Como (arquitetura completa): [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- Onde estamos: [docs/ROADMAP.md](docs/ROADMAP.md)
- O que já é suportado: [docs/compatibilidade.md](docs/compatibilidade.md)

O nome do projeto é **Measura** (crates `measura-*`, pacotes `@measura/*`, identificador `org.measura.desktop`).

---

## Regra de ouro: o Power BI é a especificação

O objetivo é **dar o mesmo resultado que o Power BI**, não algo parecido.

- Antes de implementar uma função DAX/M ou um comportamento de visual, confira o comportamento real em [dax.guide](https://dax.guide), na documentação da Microsoft (learn.microsoft.com) ou em *The Definitive Guide to DAX* (SQLBI). Cite a referência no teste.
- **Nunca invente semântica.** Se a documentação não deixar claro (ordem de avaliação, BLANK, tipo do resultado, totais), escreva o teste com o caso duvidoso marcado como `#[ignore = "confirmar no Power BI: ..."]` e avise o usuário. Não chute.
- Quando o Power BI faz algo "estranho" (BLANK = 0 é verdadeiro, total da matriz não é a soma das linhas, linha em branco virtual), **copie o estranho**. Quem vem do Power BI depende disso.
- Implemente a partir da documentação pública. Não faça engenharia reversa de binários da Microsoft.

## Invariantes de arquitetura

Não quebre estas regras sem discutir com o usuário antes:

1. **Núcleo em Rust, sem interface.** A lógica fica em `crates/`. O `apps/desktop/src-tauri` é uma casca fina, porque o mesmo núcleo vai rodar no servidor (etapa 8) e no navegador via WASM (etapa 7). Nada de `tauri` dentro de `crates/`.
2. **A interface gera DAX e M, nunca SQL.** Só o `measura-engine` (e, depois, os compiladores de `dax`/`mquery`) escreve SQL. Identificadores e literais passam sempre por `quote_ident`/`quote_literal`. Nunca interpole entrada do usuário direto no SQL.
3. **Todo visual é uma consulta no formato `SUMMARIZECOLUMNS`:** colunas de agrupamento, filtros e medidas, onde a agregação implícita equivale a uma medida implícita. Na etapa 2, antes de existir o motor DAX, os visuais já devem montar uma estrutura tipada equivalente a isso (não SQL ad hoc). Na etapa 3, o motor DAX passa a compilar essa mesma estrutura.
4. **O formato do projeto é PBIP/TMDL/PBIR.** Não invente um formato próprio. Os dados carregados ficam em `.cache/` (um `.duckdb`), fora do git.
5. **Os nomes do modelo seguem o TMDL** (`dataType: int64`, `crossFilteringBehavior: bothDirections`...). O `measura-model` mapeia o TMDL 1:1.
6. **Semântica do DAX desde o primeiro dia:** BLANK não é NULL do SQL, auto-exist, linha em branco virtual e totais avaliados no contexto do total. Ver ARQUITETURA §5.1.

## Estrutura

```
crates/
  model/            measura-model    tipos do modelo semântico (Table, Column, Measure, Relationship); TMDL
  engine/           measura-engine   DuckDB: importação, esquema, leitura paginada. Único lugar com SQL hoje
apps/desktop/
  src/              React: shell/ (faixa de opções, barra de exibições, painéis), views/ (as 3 exibições), lib/
  src-tauri/        measura-desktop  comandos Tauri finos sobre os crates
tests/fixtures/     dados de exemplo usados nos testes (Vendas.csv, Produto.csv)
docs/               apresentação, arquitetura, roadmap, compatibilidade
```

Crates e pacotes **planejados**: crie cada um quando a etapa dele começar, e não antes.

| Quando | O quê |
|---|---|
| Etapa 2 | `crates/report` (PBIR, consultas dos visuais), `packages/visuals` (ECharts) |
| Etapa 3 | `crates/dax` (lexer, parser, plano, compilador SQL, avaliador), `packages/editors` (Monaco), `tests/dax-conformance/` |
| Etapa 4 | `crates/mquery` (parser M, `Table.*` → SQL, interpretador), `tests/m-conformance/` |
| Etapa 7 | `crates/wasm`, `apps/web` |
| Etapa 8 | `crates/server` |

Quando o mesmo código React for usado pelo desktop e pelo `apps/web`, mova-o para `packages/ui`.

## Comandos

```sh
pnpm install                       # dependências JS (raiz do repo)
pnpm dev                           # abre o app desktop (Vite + Tauri) em modo dev
cargo test --workspace             # testes Rust
cargo clippy --workspace --all-targets -- -D warnings
cargo fmt --all
pnpm typecheck                     # tsc em todos os pacotes
pnpm test                          # vitest
```

- A **primeira** compilação demora vários minutos, porque o DuckDB é compilado do código-fonte em C++ (feature `bundled`). Depois fica em cache em `target/`. Ao rodar em background, espere terminar, sem polling.
- No Windows é preciso MSVC (Build Tools do VS 2022) e WebView2. Ambos já estão instalados nesta máquina.

**Antes de dizer que algo está pronto:** `cargo test --workspace`, `cargo clippy ... -D warnings`, `pnpm typecheck` e `pnpm test` devem passar. Se a mudança for visual, rode `pnpm dev` e confira na janela, ou diga explicitamente que não conferiu.

## Convenções

**Idioma:** código, identificadores e comentários em inglês. Textos da interface, mensagens de erro mostradas ao usuário e documentação em **pt-BR**.

**Rust**
- Um `Error` por crate com `thiserror`, mensagens em pt-BR. Sem `unwrap`/`expect` fora de testes (o clippy avisa). Se for inevitável, use `#[allow]` com o motivo.
- `unsafe` é proibido no workspace.
- Dependências compartilhadas ficam em `[workspace.dependencies]`, e o crate usa `dep.workspace = true`.
- Os tipos que cruzam para o frontend usam `#[serde(rename_all = "camelCase")]`.
- Os testes de integração ficam em `crates/<x>/tests/` e usam `tests/fixtures/`.

**Frontend (apps/desktop/src)**
- TypeScript estrito, com `noUncheckedIndexedAccess`.
- `lib/ipc.ts` é o **único** lugar que chama `invoke`. Cada comando lá corresponde a um em `src-tauri/src/commands.rs`, com o mesmo nome.
- `lib/model.ts` espelha os tipos Rust à mão. Ao mudar um struct serializado em Rust, atualize esse arquivo no mesmo commit. A geração automática (specta/ts-rs) está no roadmap.
- **Toda string visível vai em `lib/strings.ts`**, com a terminologia do Power BI Desktop em pt-BR ("Obter dados", "Exibição de tabela", "Poços de campos", "Dicas de ferramenta"...). Na dúvida, use o termo que o Power BI usa.
- Estado global no Zustand (`store.ts`). Estado local de componente com `useState`.
- Estilo com Tailwind v4. Os tokens de cor ficam em `index.css` (`@theme`).
- Números e datas são exibidos em pt-BR (`lib/format.ts`).
- Os comandos Tauri são `async`, porque um comando síncrono roda na thread principal e congela a janela.

**Marca:** o fluxo de trabalho é idêntico ao do Power BI, mas nome, logo, ícones e cores são próprios (acento verde-azulado `#0f766e`, não o amarelo da Microsoft). Não use "Power BI" na interface. Na documentação, pode citar como referência.

## Dependências com versão travada (e por quê)

- **React 18** (não 19): o Glide Data Grid 6 exige React ≤ 18 nas peer deps. Revise quando o Glide suportar 19.
- **marked 4**: peer dep do Glide Data Grid.
- **duckdb 1.4 `bundled`**: compila o DuckDB junto, sem precisar de biblioteca instalada no sistema.

Ao adicionar uma dependência, use `cargo add` ou `pnpm add` (versão atual), não uma versão de memória.

## Fluxo de trabalho

- Siga a ordem das etapas do [ROADMAP](docs/ROADMAP.md). Não adiante uma etapa futura (por exemplo, motor DAX durante a etapa 1) sem o usuário pedir.
- Ao terminar um item, marque no `docs/ROADMAP.md`. Ao implementar uma função DAX/M ou um visual, atualize `docs/compatibilidade.md`.
- Toda função DAX nova vem com testes: casos normais, BLANK, contexto de filtro vazio e o caso citado na referência.
- Mudanças pequenas e verificáveis. Se uma decisão contradiz a `ARQUITETURA.md`, pare e pergunte, ou atualize o documento junto, com o motivo.
