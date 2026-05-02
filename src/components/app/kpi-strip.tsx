import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function KpiStrip({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const total = models.length;
  const free = models.filter((m) => m.is_free).length;
  const providers = new Set(models.map((m) => m.provider)).size;
  const tpsValues = models.map((m) => m.tps).filter((v): v is number => v != null);
  const bestTps = tpsValues.length ? Math.max(...tpsValues) : 0;
  const sortedCap = [...models].sort((a, b) => a.capability - b.capability);
  const medCap = sortedCap[Math.floor(sortedCap.length / 2)]?.capability ?? 0;

  const items: { label: string; value: string; accent?: boolean }[] = [
    { label: "Total Models", value: formatNumber(total, 0) },
    { label: "Free Tier", value: formatNumber(free, 0), accent: true },
    { label: "Providers", value: String(providers) },
    { label: "Peak TPS", value: formatNumber(bestTps, 0) },
    { label: "Median Score", value: medCap.toFixed(1) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {items.map((it) => (
        <Card key={it.label} className="px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle)">{it.label}</div>
          <div className={`mt-1 text-[22px] font-mono font-semibold tabular-nums ${it.accent ? "text-(--color-accent)" : "text-(--color-fg)"}`}>{it.value}</div>
        </Card>
      ))}
    </div>
  );
}
