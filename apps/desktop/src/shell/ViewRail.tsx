import { t } from "../lib/strings";
import { useApp, type View } from "../store";

const views: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: "report",
    label: t.views.report,
    icon: (
      <path d="M5 20V10M10 20V4M15 20v-7M20 20V8" strokeLinecap="round" />
    ),
  },
  {
    id: "table",
    label: t.views.table,
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <path d="M3 9h18M3 14h18M9 4v16" />
      </>
    ),
  },
  {
    id: "model",
    label: t.views.model,
    icon: (
      <>
        <rect x="2" y="3" width="8" height="7" rx="1" />
        <rect x="14" y="14" width="8" height="7" rx="1" />
        <path d="M10 6.5h3v11h1" />
      </>
    ),
  },
];

export function ViewRail() {
  const current = useApp((s) => s.view);
  const setView = useApp((s) => s.setView);

  return (
    <nav className="flex w-12 flex-col items-center gap-1 border-r border-line bg-white pt-2">
      {views.map((v) => (
        <button
          key={v.id}
          title={v.label}
          aria-label={v.label}
          onClick={() => setView(v.id)}
          className={`flex h-10 w-10 items-center justify-center border-l-2 ${
            v.id === current ? "border-accent text-accent" : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            {v.icon}
          </svg>
        </button>
      ))}
    </nav>
  );
}
