import { useState } from "react";
import { t } from "../i18n";
import { getDataFromCsv } from "./getData";

const tabs = [t.ribbon.home, t.ribbon.insert, t.ribbon.modeling, t.ribbon.view, t.ribbon.help];

export function Ribbon() {
  const [active, setActive] = useState<string>(t.ribbon.home);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b border-line bg-white">
      <div className="flex items-center gap-1 bg-accent px-3 text-white">
        <span className="mr-4 py-1.5 font-semibold">{t.appName}</span>
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={`px-3 py-1.5 ${tab === active ? "bg-white text-accent" : "hover:bg-white/15"}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex h-20 items-stretch px-2 py-1">
        {active === t.ribbon.home && (
          <RibbonGroup label={t.ribbon.data}>
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex h-full flex-col items-center justify-center rounded px-3 hover:bg-chrome"
              >
                <DatabaseIcon />
                <span className="mt-1">{t.ribbon.getData} ▾</span>
              </button>
              {menuOpen && (
                <div className="absolute left-0 top-full z-10 min-w-40 border border-line bg-white py-1 shadow-md">
                  <button
                    className="w-full px-3 py-1.5 text-left hover:bg-accent-soft"
                    onClick={() => {
                      setMenuOpen(false);
                      void getDataFromCsv();
                    }}
                  >
                    {t.ribbon.textCsv}
                  </button>
                </div>
              )}
            </div>
          </RibbonGroup>
        )}
      </div>
    </header>
  );
}

function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col border-r border-line px-1">
      <div className="flex flex-1 items-stretch gap-1">{children}</div>
      <div className="text-center text-[11px] text-gray-500">{label}</div>
    </div>
  );
}

function DatabaseIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
      <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </svg>
  );
}
