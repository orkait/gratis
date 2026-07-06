import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export function KpiStrip({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  const total = models.length;
  const free = models.filter((m) => m.is_free).length;
  const providers = new Set(models.map((m) => m.provider)).size;
  const overalls = models.map((m) => m.scores?.overall).filter((v): v is number => v != null).sort((a, b) => a - b);
  const median = overalls.length ? overalls[Math.floor(overalls.length / 2)] : 0;
  const top = overalls.length ? overalls[overalls.length - 1] : 0;
  const rated = models.filter((m) => m.arena_elo != null).length;

  const items: { label: string; value: string; sub?: string; tone?: "accent" | "success" | "neutral" }[] = [
    { label: "Models", value: String(total), tone: "neutral" },
    { label: "Free to run", value: String(free), sub: total ? `${Math.round((free / total) * 100)}%` : undefined, tone: "success" },
    { label: "Providers", value: String(providers), tone: "neutral" },
    { label: "Median score", value: median.toFixed(0), sub: "of 100", tone: "accent" },
    { label: "Top score", value: top.toFixed(0), sub: rated ? `${rated} human-rated` : undefined, tone: "accent" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5">
      {items.map((it) => (
        <div key={it.label} className="relative overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-1) px-4 py-3">
          <div className={cn("absolute inset-x-0 top-0 h-[2px]",
            it.tone === "accent" ? "bg-(--color-accent)" : it.tone === "success" ? "bg-(--color-success)" : "bg-(--color-border-strong)")} />
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-(--color-fg-subtle)">{it.label}</div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className={cn("text-[26px] leading-none font-mono font-semibold tabular-nums",
              it.tone === "accent" ? "text-(--color-accent)" : it.tone === "success" ? "text-(--color-success)" : "text-(--color-fg)")}>
              {it.value}
            </span>
            {it.sub && <span className="text-[11px] font-mono text-(--color-fg-subtle)">{it.sub}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
