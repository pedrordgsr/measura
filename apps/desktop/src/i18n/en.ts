// UI strings, English (source of truth). Use the same words as Power BI Desktop's English UI so
// users find things where they expect them. Never use Microsoft brand names here.

export const en = {
  appName: "Measura",
  ribbon: {
    home: "Home",
    insert: "Insert",
    modeling: "Modeling",
    view: "View",
    help: "Help",
    getData: "Get data",
    textCsv: "Text/CSV",
    data: "Data",
  },
  views: {
    report: "Report view",
    table: "Table view",
    model: "Model view",
  },
  panes: {
    data: "Data",
    visualizations: "Visualizations",
    filters: "Filters",
    searchPlaceholder: "Search",
  },
  report: {
    page: (n: number) => `Page ${n}`,
    emptyCanvas: "Select or drag fields from the Data pane to build a visual.",
  },
  table: {
    rows: (n: number) => `${n.toLocaleString("en-US")} rows`,
    noTable: "Select a table in the Data pane.",
  },
  model: {
    empty: "Load data to see your tables and relationships.",
  },
  home: {
    title: "Add data to your report",
    subtitle: "Once loaded, your data will appear in the Data pane.",
  },
  values: {
    true: "True",
    false: "False",
  },
  common: {
    close: "Close",
  },
};

export type Strings = typeof en;
