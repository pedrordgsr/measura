import { t } from "../i18n";
import { useApp } from "../store";

export function ErrorBar() {
  const error = useApp((s) => s.error);
  const clear = useApp((s) => s.clearError);
  if (!error) return null;

  return (
    <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-3 py-1.5 text-red-800">
      <span className="flex-1">{error}</span>
      <button onClick={clear} aria-label={t.common.close} className="px-2 hover:text-red-950">
        ✕
      </button>
    </div>
  );
}
