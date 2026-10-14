# An open, cross-platform Power BI Desktop

## The problem

Millions of people know how to use Power BI. But the tool:

- **Only runs on Windows.** Analysts on macOS or Linux need a virtual machine or a separate computer.
- **Is closed.** You cannot fix it, extend it or adapt it.
- **Is expensive to share.** Publishing requires Microsoft's service and a per-user license.
- **Keeps your data in Microsoft's cloud.** Hosting on-premises requires Power BI Report Server, which is limited and licensed separately.

People who already master Power Query, DAX and the report editor do not want to learn another tool. They want **the same tool, without these limitations**.

---

## The solution

A **faithful clone of Power BI Desktop**, open source, running on Windows, macOS and Linux.

**Everything should feel familiar to Power BI users:**

| In Power BI | In Measura |
|---|---|
| Power Query with applied steps and the M language | The same: applied steps, advanced editor in M |
| Measures and calculated columns in DAX | The same: DAX, with the same filter behavior |
| Report, table and model views | The same three views, with the same panes |
| Visualizations, fields, filters and formatting | Same layout and same names |
| JSON themes | Compatible with Power BI themes |
| PBIP projects | Opens existing PBIP projects |

**What you gain over Power BI:**

- Runs on **any operating system**
- **Open source and free**
- **Publish anywhere:** static site, your own server or the cloud
- **Text-based project files,** versionable with git

---

## Challenges and how we address them

| Challenge | Why it is hard | How we address it |
|---|---|---|
| **Reproducing DAX** | It is the heart of Power BI. Filter context, context transition and BLANK have subtle rules | DAX is implemented in phases, starting with the most used functions. A **test suite compares results against real Power BI** on public datasets |
| **Reproducing M** | It is a full language with hundreds of functions | The UI generates M, as Power BI does. The most common `Table.*` functions come first, and everything compiles to SQL |
| **"Almost the same" frustrates users** | Power BI users notice what is missing | A public list of what is supported, priorities set by users, and clear messages when a function does not exist yet |
| **Performance** | Power BI's engine (VertiPaq) is highly optimized | **DuckDB**, a high-performance analytical database, is the storage engine |
| **File compatibility** | `.pbix` is binary and closed | We use **PBIP/TMDL**, Microsoft's publicly documented text project format |
| **Branding** | We cannot copy the name or visual identity | The workflow is the same; the name, icons and look are our own |

---

## Technology

| Part | Technology | Why |
|---|---|---|
| Engine (DAX, M, model) | **Rust** | Fast; runs on desktop, server and in the browser |
| Database | **DuckDB** | Plays the role of VertiPaq: columnar, fast, embedded |
| Desktop app | **Tauri** | Lightweight; works on Windows, macOS and Linux |
| UI | **React + TypeScript** | The same UI on desktop and web |
| Charts | **ECharts** | Covers practically every Power BI visual |
| DAX and M editor | **Monaco** | The VS Code editor, with autocomplete |

---

## Plan

Each stage delivers something usable.

| Stage | Delivers | Outcome |
|---|---|---|
| **1. Foundation** | Import Excel/CSV, table view, model view with relationships | See and relate data |
| **2. Reports** | Core visuals, slicers and cross-filtering | **First working report** |
| **3. Essential DAX** | Measures with `SUM`, `CALCULATE`, `ALL`, `FILTER`, `DIVIDE`, variables | Everyday measures |
| **4. Power Query** | Editor with applied steps, generated M, advanced editor | Clean and transform data |
| **5. Everyday DAX** | Iterators (`SUMX`), calculated columns, time intelligence | Parity with most real-world reports |
| **6. Open Power BI projects** | Import PBIP: model, measures, M queries and visuals | Bring existing reports over |
| **7. Publish** | Export as a static site | Share with a link, at no cost |
| **8. Server** | Docker with workspaces, scheduled refresh and DAX-based RLS | Enterprise use |

**First concrete goal (stages 1 to 3):** import a spreadsheet, create relationships, write DAX measures and build a report with filters, all on macOS or Linux.

---

## Summary

> **The Power BI Desktop you already know, open and on any system.**
> Same Power Query, same DAX, same screens, and the freedom to publish wherever you want.
