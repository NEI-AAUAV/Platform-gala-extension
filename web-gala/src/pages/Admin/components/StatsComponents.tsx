import React from "react";

export function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly sub?: string;
  readonly icon?: React.ReactNode;
  readonly accent?: "green" | "yellow" | "red" | "default";
}) {
  const accentCls = {
    green: "text-emerald-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
    default: "text-white/90",
  }[accent ?? "default"];

  return (
    <div className="border-light-gold/20 bg-white/3 border p-4">
      <div className="flex items-center gap-2 text-xs text-white/40">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${accentCls}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[0.6rem] text-white/25">{sub}</p>}
    </div>
  );
}

export function MiniBar({
  label,
  value,
  max,
  color,
}: {
  readonly label: string;
  readonly value: number;
  readonly max: number;
  readonly color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 truncate text-[0.65rem] text-white/50">
        {label}
      </span>
      <div className="bg-white/8 relative h-2 flex-1 overflow-hidden rounded-full">
        <div
          className={`absolute left-0 top-0 h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right text-[0.65rem] text-white/40">
        {value}
      </span>
    </div>
  );
}
