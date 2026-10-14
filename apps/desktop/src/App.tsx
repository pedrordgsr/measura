import { Ribbon } from "./shell/Ribbon";
import { ViewRail } from "./shell/ViewRail";
import { DataPane } from "./shell/DataPane";
import { ErrorBar } from "./shell/ErrorBar";
import { ReportView } from "./views/ReportView";
import { TableView } from "./views/TableView";
import { ModelView } from "./views/ModelView";
import { useApp } from "./store";

export function App() {
  const view = useApp((s) => s.view);

  return (
    <div className="flex h-full flex-col">
      <Ribbon />
      <ErrorBar />
      <div className="flex min-h-0 flex-1">
        <ViewRail />
        <main className="min-w-0 flex-1">
          {view === "report" && <ReportView />}
          {view === "table" && <TableView />}
          {view === "model" && <ModelView />}
        </main>
        <DataPane />
      </div>
    </div>
  );
}
