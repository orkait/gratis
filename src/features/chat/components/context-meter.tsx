"use client";
import { cn } from "@/lib/utils";
import { CONTEXT_THRESHOLDS } from "../lib/chat-config";

export type ContextMeterProps = {
  used: number | null;
  max: number | null;
  /** `used` is a heuristic estimate (chars/4), not exact provider tokens. */
  estimated?: boolean;
  className?: string;
};

/** "idle" is not a level of fullness - it is the absence of a reading (no model context, or nothing
 *  said yet). Keeping it in the same union is what lets the donut render one way in every case. */
type MeterState = "idle" | "ok" | "warning" | "danger";

const STROKE: Record<MeterState, string> = {
  idle: "var(--color-border)",
  ok: "var(--color-accent)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

const TEXT_TONE: Record<MeterState, string> = {
  idle: "text-(--color-fg-subtle)",
  ok: "text-(--color-fg-muted)",
  warning: "text-(--color-warning)",
  danger: "text-(--color-danger)",
};

const DONUT = { size: 18, center: 9, radius: 7, strokeWidth: 1.5 } as const;

function meterState(percent: number): MeterState {
  if (percent >= CONTEXT_THRESHOLDS.danger) return "danger";
  if (percent >= CONTEXT_THRESHOLDS.warning) return "warning";
  return "ok";
}

function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${Math.round(count / 1_000)}K`;
  return String(count);
}

export function ContextMeter({ used, max, estimated, className }: ContextMeterProps) {
  if (used == null || max == null || max <= 0) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-[11px] font-mono",
          TEXT_TONE.idle,
          className,
        )}
        title="Context unknown"
      >
        <Donut percent={0} state="idle" />
        <span>-</span>
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, (used / max) * 100));
  const state = meterState(percent);
  const prefix = estimated ? "~" : "";
  const qualifier = estimated ? " (estimated)" : "";

  return (
    <div
      className={cn("flex items-center gap-1.5 text-[11px] font-mono", className)}
      title={`Context${qualifier}: ${formatTokens(used)} / ${formatTokens(max)} (${percent.toFixed(0)}%)`}
    >
      <Donut percent={percent} state={state} />
      <span className={TEXT_TONE[state]}>
        {prefix}
        {formatTokens(used)}/{formatTokens(max)}
      </span>
    </div>
  );
}

function Donut({ percent, state }: { percent: number; state: MeterState }) {
  const circumference = 2 * Math.PI * DONUT.radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg
      width={DONUT.size}
      height={DONUT.size}
      viewBox={`0 0 ${DONUT.size} ${DONUT.size}`}
      aria-hidden="true"
    >
      <circle
        cx={DONUT.center}
        cy={DONUT.center}
        r={DONUT.radius}
        fill="none"
        stroke="var(--color-border)"
        strokeWidth={DONUT.strokeWidth}
      />
      {state !== "idle" && (
        <circle
          cx={DONUT.center}
          cy={DONUT.center}
          r={DONUT.radius}
          fill="none"
          stroke={STROKE[state]}
          strokeWidth={DONUT.strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          // Starts the arc at 12 o'clock instead of 3.
          transform={`rotate(-90 ${DONUT.center} ${DONUT.center})`}
          className="transition-[stroke-dashoffset] duration-200 ease-out"
        />
      )}
    </svg>
  );
}
