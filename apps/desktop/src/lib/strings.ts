// UI terminology. Use the same words as Power BI Desktop in pt-BR, so users find things where
// they expect. Never use Microsoft brand names here.

export const t = {
  appName: "Measura",
  ribbon: {
    home: "Página Inicial",
    insert: "Inserir",
    modeling: "Modelagem",
    view: "Exibição",
    help: "Ajuda",
    getData: "Obter dados",
    textCsv: "Texto/CSV",
    data: "Dados",
  },
  views: {
    report: "Exibição de relatório",
    table: "Exibição de tabela",
    model: "Exibição de modelo",
  },
  panes: {
    data: "Dados",
    visualizations: "Visualizações",
    filters: "Filtros",
    searchPlaceholder: "Pesquisar",
  },
  report: {
    page: (n: number) => `Página ${n}`,
    emptyCanvas: "Selecione ou arraste campos do painel Dados para criar um visual.",
  },
  table: {
    rows: (n: number) => `${n.toLocaleString("pt-BR")} linhas`,
    noTable: "Selecione uma tabela no painel Dados.",
  },
  model: {
    empty: "Carregue dados para ver as tabelas e as relações.",
  },
  home: {
    title: "Adicionar dados ao relatório",
    subtitle: "Depois de carregados, os dados aparecerão no painel Dados.",
  },
} as const;
