"use client";
import { cn } from "@/lib/utils";

export type ContextMeterProps = {
  used: number | null;
  max: number | null;
  /** used is a heuristic estimate (chars/4), not exact provider tokens. */
  estimated?: boolean;
  className?: string;
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

export function ContextMeter({ used, max, estimated, className }: ContextMeterProps) {
  const prefix = estimated ? "~" : "";
  if (used == null || max == null || max <= 0) {
    return (
      <div className={cn("flex items-center gap-1.5 text-[11px] font-mono text-(--color-fg-subtle)", className)} title="Context unknown">
        <DonutSvg pct={0} state="idle" />
        <span>-</span>
      </div>
    );
  }

  const pct = Math.max(0, Math.min(100, (used / max) * 100));
  const state = pct >= 90 ? "danger" : pct >= 70 ? "warning" : "ok";

  return (
    <div
      className={cn("flex items-center gap-1.5 text-[11px] font-mono", className)}
      title={`Context${estimated ? " (estimated)" : ""}: ${formatTokens(used)} / ${formatTokens(max)} (${pct.toFixed(0)}%)`}
    >
      <DonutSvg pct={pct} state={state} />
      <span className={cn(
        state === "danger" && "text-(--color-danger)",
        state === "warning" && "text-(--color-warning)",
        state === "ok" && "text-(--color-fg-muted)",
      )}>
        {prefix}{formatTokens(used)}/{formatTokens(max)}
      </span>
    </div>
  );
}

function DonutSvg({ pct, state }: { pct: number; state: "ok" | "warning" | "danger" | "idle" }) {
  const radius = 7;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const strokeColor =
    state === "idle" ? "var(--color-border)"
    : state === "danger" ? "var(--color-danger)"
    : state === "warning" ? "var(--color-warning)"
    : "var(--color-accent)";

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="1.5" />
      {state !== "idle" && (
        <circle
          cx="9"
          cy="9"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 9 9)"
          style={{ transition: "stroke-dashoffset 200ms ease-out" }}
        />
      )}
    </svg>
  );
}
