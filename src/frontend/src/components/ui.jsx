export function Card({ children, className = "" }) {
  return <div className={`rounded-xl border border-blue-100 bg-white/95 p-4 shadow-sm shadow-blue-100/60 ${className}`}>{children}</div>;
}

export function Badge({ children, tone = "slate" }) {
  const tones = {
    slate: "bg-blue-100 text-blue-800",
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    blue: "bg-indigo-100 text-indigo-800"
  };

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
