export function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-blue-100 bg-white/95 p-4 shadow-sm shadow-blue-100/60 transition-all duration-300 ease-out motion-safe:animate-fade-in-up hover:-translate-y-0.5 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    blue: "bg-indigo-100 text-indigo-800"
  };

  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors duration-200 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Spinner({ className = "" }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
      aria-hidden="true"
    />
  );
}

export function FullScreenLoader({ show, label = "Loading..." }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 backdrop-blur-[2px]">
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-2xl shadow-slate-900/30 dark:bg-slate-900/95">
        <span
          className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-700"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{label}</p>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (!toasts?.length) return null;
  const tones = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    error: "border-rose-200 bg-rose-50 text-rose-800",
    info: "border-blue-200 bg-blue-50 text-blue-800"
  };

  return (
    <div className="fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((toast) => (
        <div key={toast.id} className={`rounded-lg border px-3 py-2 text-sm shadow ${tones[toast.type] || tones.info}`}>
          <div className="flex items-start justify-between gap-2">
            <p>{toast.message}</p>
            <button
              type="button"
              className="text-xs font-semibold opacity-70 hover:opacity-100"
              onClick={() => onDismiss(toast.id)}
            >
              Close
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
