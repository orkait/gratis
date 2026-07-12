import { cn } from "@/lib/utils";

export type BarTone = "accent" | "muted" | "human";

/** Lookup map instead of a nested ternary: adding a tone is a new entry, not another `? :`. */
const TONE_CLASS: Readonly<Record<BarTone, string>> = {
  accent: "bg-(--color-accent)",
  muted: "bg-(--color-fg-subtle)/70",
  human: "bg-(--color-success)",
};

const MIN_VISIBLE_WIDTH = 2;
const MAX_WIDTH = 100;

function widthOf(value: number | null | undefined): number {
  if (value == null) return 0;
  return Math.max(MIN_VISIBLE_WIDTH, Math.min(MAX_WIDTH, value));
}

export function ScoreBar({ value, tone = "accent" }: { value?: number | null; tone?: BarTone }) {
  return (
    <div className="h-2 w-full rounded-sm bg-(--color-surface-3) overflow-hidden">
      <div
        className={cn("h-full rounded-sm transition-[width] duration-300", TONE_CLASS[tone])}
        style={{ width: `${widthOf(value)}%` }}
      />
    </div>
  );
}
