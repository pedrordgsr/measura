# Um Power BI Desktop aberto e multiplataforma

## O problema

Milhões de pessoas sabem usar o Power BI. Mas a ferramenta:

- **Só roda no Windows.** Analistas com Mac ou Linux precisam de máquina virtual ou de um computador separado.
- **É fechada.** Não dá para corrigir, estender nem adaptar.
- **Compartilhar custa caro.** Publicar exige o serviço da Microsoft e licença por usuário.
- **Prende os dados na nuvem da Microsoft.** Hospedar internamente exige o Power BI Report Server, que é limitado e licenciado à parte.

Quem já domina Power Query, DAX e o editor de relatórios não quer aprender outra ferramenta. Quer **a mesma ferramenta, sem essas limitações**.

---

## A solução

Um **clone fiel do Power BI Desktop**, de código aberto, que roda em Windows, Mac e Linux.

**Para quem já usa Power BI, tudo deve parecer familiar:**

| No Power BI | Neste projeto |
|---|---|
| Power Query com etapas aplicadas e linguagem M | O mesmo: etapas aplicadas, editor avançado em M |
| Medidas e colunas calculadas em DAX | O mesmo: DAX, com o mesmo comportamento de filtros |
| Exibição de relatório, de dados e de modelo | As mesmas três exibições, com os mesmos painéis |
| Visualizações, campos, filtros e formatação | Mesma organização e mesmos nomes |
| Temas em JSON | Compatível com os temas do Power BI |
| Projetos PBIP | Abre projetos PBIP existentes |

**O que ganha em relação ao Power BI:**

- Roda em **qualquer sistema operacional**
- **Código aberto e gratuito**
- **Publicação livre:** site estático, servidor próprio ou nuvem
- **Projeto em texto,** versionável no git

---

## Os desafios e como resolvemos

| Desafio | Por que é difícil | Como resolvemos |
|---|---|---|
| **Reproduzir o DAX** | É o coração do Power BI. Contexto de filtro, transição de contexto e BLANK têm regras sutis | Implementamos o DAX em fases, começando pelas funções mais usadas. Uma **suíte de testes compara os resultados com o Power BI real** em bases públicas |
| **Reproduzir a linguagem M** | É uma linguagem completa, com centenas de funções | A interface gera M, como no Power BI. Implementamos primeiro as funções `Table.*` mais usadas e convertemos tudo para SQL |
| **"Quase igual" frustra** | Quem vem do Power BI nota o que falta | Lista pública do que é suportado, prioridades definidas pelos usuários e mensagens claras quando uma função ainda não existe |
| **Desempenho** | O motor do Power BI (VertiPaq) é muito otimizado | Usamos o **DuckDB**, um banco analítico de alto desempenho, como motor de armazenamento |
| **Compatibilidade de arquivos** | O `.pbix` é binário e fechado | Usamos o **PBIP/TMDL**, o formato de projeto em texto da Microsoft, com documentação pública |
| **Marca** | Não podemos copiar nome nem identidade visual | O fluxo de trabalho é o mesmo; nome, ícones e visual são próprios |

---

## Tecnologias

| Parte | Tecnologia | Por quê |
|---|---|---|
| Motor (DAX, M, modelo) | **Rust** | Rápido; roda no desktop, no servidor e no navegador |
| Banco de dados | **DuckDB** | Faz o papel do VertiPaq: colunar, rápido, embutido |
| App desktop | **Tauri** | Leve; funciona em Windows, Mac e Linux |
| Interface | **React + TypeScript** | A mesma interface no desktop e na web |
| Gráficos | **ECharts** | Cobre praticamente todos os visuais do Power BI |
| Editor DAX e M | **Monaco** | O editor do VS Code, com autocomplete |

---

## Como executar

Cada etapa entrega algo usável.

| Etapa | O que entrega | Resultado |
|---|---|---|
| **1. Base** | Importar Excel/CSV, exibição de dados, exibição de modelo com relações | Ver e relacionar os dados |
| **2. Relatórios** | Visuais principais, segmentadores e interação entre visuais | **Primeiro relatório funcionando** |
| **3. DAX essencial** | Medidas com `SUM`, `CALCULATE`, `ALL`, `FILTER`, `DIVIDE`, variáveis | Medidas do dia a dia |
| **4. Power Query** | Editor com etapas aplicadas, M gerado automaticamente, editor avançado | Limpar e transformar dados |
| **5. DAX completo do dia a dia** | Iteradores (`SUMX`), colunas calculadas, inteligência de tempo | Paridade com a maioria dos relatórios reais |
| **6. Abrir projetos do Power BI** | Importar PBIP: modelo, medidas, consultas M e visuais | Trazer relatórios existentes |
| **7. Publicar** | Exportar como site estático | Compartilhar com um link, sem custo |
| **8. Servidor** | Docker com workspaces, atualização agendada e RLS com funções DAX | Uso em empresas |

**Primeira meta concreta (etapas 1 a 3):** importar uma planilha, criar relações, escrever medidas em DAX e montar um relatório com filtros, tudo num Mac ou Linux.

---

## Resumo

> **O Power BI Desktop que você já conhece, aberto e em qualquer sistema.**
> Mesmo Power Query, mesmo DAX, mesmas telas, e liberdade para publicar onde quiser.
