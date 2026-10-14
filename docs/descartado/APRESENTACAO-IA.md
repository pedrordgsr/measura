# Uma ferramenta de BI aberta, feita para a era da IA

## O problema

O Power BI é a ferramenta de BI mais usada do mundo, mas:

- **Só roda no Windows.** Quem usa Mac ou Linux fica de fora.
- **É fechado.** Ninguém pode adaptar, estender ou hospedar por conta própria.
- **Compartilhar custa caro.** Publicar exige o serviço da Microsoft e licença por usuário.
- **É difícil de aprender.** Power Query (linguagem M) e DAX têm uma curva de aprendizado alta.
- **Não combina com o git.** O arquivo `.pbix` é binário, então não dá para ver o que mudou nem trabalhar em equipe com facilidade.

Ao mesmo tempo, a forma de analisar dados está mudando. Com IAs como o Claude, as pessoas querem **descrever o que precisam** e receber o resultado, em vez de aprender uma linguagem nova.

---

## Caminho 1: um clone aberto do Power BI Desktop

**A ideia:** reproduzir a experiência que analistas já conhecem, em código aberto e para qualquer sistema operacional.

**O que teria:**

| Parte | O que faz |
|---|---|
| Editor de consultas | Importar e limpar dados em etapas, como no Power Query |
| Visão de dados | Ver as tabelas importadas |
| Visão de modelo | Ligar as tabelas entre si (relações) |
| Medidas em DAX | Criar cálculos como "Total de vendas" e "% do total" |
| Editor de relatórios | Montar gráficos arrastando campos, com filtros entre os visuais |

**Os problemas:**

- **O DAX é o gargalo.** Ele é o coração do Power BI e tem regras muito sutis. Reproduzir o comportamento dele com fidelidade leva anos.
- **Sempre vai ser "quase igual".** Quem vem do Power BI vai notar o que falta e se frustrar.
- **Compete no terreno da Microsoft,** que oferece o Power BI Desktop de graça.
- **Mantém a curva de aprendizado:** continua exigindo saber DAX e M.

---

## Caminho 2: uma ferramenta construída em torno da IA

**A ideia:** o usuário conversa ("junta essas planilhas, corrige as datas e me mostra o faturamento por região") e a IA monta a limpeza dos dados, os cálculos e os gráficos.

**Os pontos fortes:**

- Qualquer pessoa consegue usar, mesmo sem saber DAX ou SQL
- Os cálculos são em **SQL**, que as IAs escrevem muito melhor do que DAX
- Pode ser controlada **de dentro do app** (chat) ou **de fora** (Claude Desktop ou Claude Code, via MCP)

**Os problemas:**

- **Confiança:** a IA pode gerar um número errado que parece certo. Esse é o maior risco.
- **Perde a familiaridade:** quem já domina Power BI não reconhece o fluxo de trabalho.
- **Se a IA for só um enfeite,** vira mais uma ferramenta de BI entre muitas.
- **Privacidade:** empresas não querem mandar os dados para uma IA externa.

---

## A solução proposta: os dois caminhos sobre a mesma base

Em vez de escolher um caminho, construímos **um núcleo único** e colocamos as duas experiências por cima dele:

```
   ┌──────────────────────────┐   ┌──────────────────────────┐
   │ Interface clássica       │   │ Assistente de IA         │
   │ (estilo Power BI)        │   │ (chat no app + MCP)      │
   └────────────┬─────────────┘   └─────────────┬────────────┘
                └───────────────┬───────────────┘
                   ┌────────────▼────────────┐
                   │ Núcleo único            │
                   │ dados, modelo, cálculos │
                   └─────────────────────────┘
```

**Como cada problema é resolvido:**

| Problema | Solução |
|---|---|
| DAX é difícil de reproduzir | Cálculos em **SQL** com o comportamento útil das medidas do DAX (responder aos filtros dos gráficos). A compatibilidade com DAX vem depois, só para migrar projetos do Power BI |
| Falta de familiaridade | A interface clássica continua lá: etapas, visão de modelo, arrastar campos |
| Números errados vindos da IA | A IA **propõe** e o app **executa e mostra** antes de aplicar. Tudo pode ser desfeito, e cada número mostra de onde veio |
| Privacidade | Por padrão, a IA vê só a estrutura e uma amostra dos dados. Também dá para usar modelos que rodam na própria máquina |
| Colaboração | O projeto é salvo como **arquivos de texto**, que podem ir para o git e ser revisados em equipe |
| Publicação | Três opções: site estático (grátis, no GitHub Pages), servidor próprio (Docker) ou nuvem hospedada |

**O diferencial:** uma ferramenta de BI **aberta, multiplataforma, versionável no git e que a IA consegue operar**. Hoje nenhuma ferramenta reúne tudo isso.

---

## Tecnologias

| Parte | Tecnologia | Por quê |
|---|---|---|
| Núcleo | **Rust** | Rápido; roda no desktop, no servidor e no navegador |
| Banco de dados | **DuckDB** | Banco analítico muito rápido, embutido no app |
| App desktop | **Tauri** | Leve; funciona em Windows, Mac e Linux |
| Interface | **React + TypeScript** | A mesma interface serve para desktop e web |
| Gráficos | **ECharts** | Cobre praticamente todos os visuais do Power BI |
| IA | **MCP** + chat com o Claude | Funciona dentro e fora do app |

---

## Como executar

Cada etapa entrega algo usável, para mostrar progresso cedo e atrair colaboradores.

| Etapa | O que entrega | Resultado |
|---|---|---|
| **1. Base** | Importar planilhas e CSV, visão de dados, visão de modelo | Ver e relacionar os dados |
| **2. Relatórios** | Gráficos, tabelas, cartões e filtros que interagem entre si | **Primeiro dashboard funcionando** |
| **3. IA via MCP** | O Claude passa a conseguir operar o app | Montar um dashboard conversando com o Claude |
| **4. Limpeza de dados** | Editor de etapas + assistente que sugere a limpeza | Power Query com IA |
| **5. Cálculos** | Medidas em SQL, criadas à mão ou por descrição | "Ticket médio", "variação contra o ano anterior" |
| **6. Publicar** | Exportar o relatório como site estático | Compartilhar com um link, sem custo |
| **7. Servidor** | Docker com login, permissões e atualização automática | Uso em empresas |
| **8. Migração** | Importar projetos do Power BI e traduzir DAX | Trazer quem já usa Power BI |

**Primeira meta concreta (etapas 1 a 3):** abrir um CSV, montar um dashboard com filtros e conseguir pedir ao Claude "cria uma página de vendas por região". Isso já demonstra a proposta inteira.

---

## Resumo

> Um **Power BI aberto**, que roda em qualquer sistema, salva tudo em texto e pode ser **operado por IA**.
> Começamos pela base comum e pela IA, que entregam valor rápido, e deixamos a compatibilidade com o DAX para o fim, como ferramenta de migração.
