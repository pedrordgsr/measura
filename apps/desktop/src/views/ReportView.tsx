import { t } from "../lib/strings";
import { useApp } from "../store";
import { getDataFromCsv } from "../shell/getData";

export function ReportView() {
  const hasData = useApp((s) => s.tables.length > 0);

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col bg-canvas">
        <div className="flex flex-1 items-center justify-center overflow-auto p-6">
          {/* 16:9 page, the Power BI default size (1280x720) */}
          <div className="flex aspect-video w-full max-w-5xl items-center justify-center bg-white shadow">
            {hasData ? (
              <p className="text-gray-400">{t.report.emptyCanvas}</p>
            ) : (
              <div className="text-center">
                <h1 className="text-2xl font-light">{t.home.title}</h1>
                <p className="mb-4 mt-1 text-gray-500">{t.home.subtitle}</p>
                <button
                  onClick={() => void getDataFromCsv()}
                  className="rounded border border-line px-4 py-2 hover:border-accent hover:bg-accent-soft"
                >
                  {t.ribbon.textCsv}
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex border-t border-line bg-white">
          <span className="border-b-2 border-accent px-4 py-1.5">{t.report.page(1)}</span>
          <span className="px-3 py-1.5 text-gray-500">+</span>
        </div>
      </div>
      <PanePlaceholder title={t.panes.filters} />
      <PanePlaceholder title={t.panes.visualizations} />
    </div>
  );
}

function PanePlaceholder({ title }: { title: string }) {
  return (
    <aside className="w-52 border-l border-line bg-pane">
      <h2 className="px-3 pt-2 text-sm font-semibold">{title}</h2>
    </aside>
  );
}
