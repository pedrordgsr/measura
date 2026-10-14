# Roadmap

As etapas são as de [ARQUITETURA.md §11](ARQUITETURA.md#11-execução-por-etapas). Aqui fica o detalhamento da etapa em andamento.

**Etapa atual: 1. Base**

---

## Etapa 1. Base

**Critério de pronto:** importar planilhas, ver os dados, relacionar tabelas, salvar e reabrir.

### Fundação
- [x] Monorepo: workspace Cargo + workspace pnpm, `CLAUDE.md`
- [x] `measura-model`: tipos do modelo (tabela, coluna, medida, relação) com nomes do TMDL
- [x] `measura-engine`: DuckDB embutido, importar CSV, esquema com tipos TMDL, leitura paginada
- [x] App Tauri: faixa de opções, barra das três exibições, painel Dados
- [x] Exibição de tabela: grade paginada (Glide Data Grid) com formatação pt-BR
- [ ] CI no GitHub Actions: testes, clippy e typecheck em Windows, macOS e Linux
- [ ] Gerar `lib/model.ts` a partir dos tipos Rust (specta ou ts-rs)

### Dados
- [ ] Importar Excel (`.xlsx`): escolher planilhas/tabelas, como o Navegador do Power BI
- [ ] Importar Parquet
- [ ] Diálogo de pré-visualização do CSV antes de carregar (delimitador, codificação, primeira linha como cabeçalho)
- [ ] Atualizar (recarregar da fonte)

### Projeto
- [ ] Escrever TMDL (`model.tmdl`, `tables/*.tmdl`, `relationships.tmdl`) a partir do `measura-model`
- [ ] Ler TMDL para o `measura-model` (testes de ida e volta)
- [ ] Estrutura PBIP completa (`.pbip`, `.SemanticModel/`, `.Report/`) e cache `.duckdb` em `.cache/`
- [ ] Arquivo: Novo, Abrir, Salvar, Salvar como; aviso de alterações não salvas

### Exibição de modelo
- [ ] Diagrama com React Flow + ELK: tabelas arrastáveis, posições salvas no projeto
- [ ] Criar relação arrastando uma coluna até outra
- [ ] Editar relação: cardinalidade, direção do filtro cruzado, ativa ou inativa
- [ ] Detecção automática de relações ao carregar (mesmo nome + unicidade no lado 1)
- [ ] Painel Propriedades: renomear, tipo de dados, formato, ocultar, classificar por coluna

### Exibição de tabela
- [ ] Ordenar e filtrar pelo cabeçalho da coluna (só visualização, como no Power BI)
- [ ] Selecionar coluna ao clicar no painel Dados

---

## Próximas etapas (resumo)

| Etapa | Entrega |
|---|---|
| 2. Relatórios | Canvas, painéis Visualizações/Filtros, visuais principais, segmentadores, filtragem cruzada |
| 3. DAX essencial | Motor DAX com as funções da fase essencial, barra de fórmulas, suíte de conformidade |
| 4. Power Query | Motor M, editor com Etapas Aplicadas e Editor Avançado |
| 5. DAX do dia a dia | Iteradores, transição de contexto, colunas calculadas, inteligência de tempo |
| 6. Abrir PBIP | Ler projetos do Power BI (TMDL + PBIR), temas |
| 7. Publicar | Site estático com DuckDB-WASM |
| 8. Servidor | Docker, workspaces, atualização agendada, RLS |
