"use client";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { useMarketKpis, type Kpi, type KpiTone } from "../hooks/use-market-kpis";

const KPI_COUNT = 5;
const GRID = "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-5";

/** Lookup maps instead of nested ternaries: a new tone is two entries, not four more branches. */
const RULE_COLOR: Readonly<Record<KpiTone, string>> = {
  accent: "bg-(--color-accent)",
  success: "bg-(--color-success)",
  neutral: "bg-(--color-border-strong)",
};

const VALUE_COLOR: Readonly<Record<KpiTone, string>> = {
  accent: "text-(--color-accent)",
  success: "text-(--color-success)",
  neutral: "text-(--color-fg)",
};

export function KpiStrip({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  const kpis = useMarketKpis(models);

  if (loading) {
    return (
      <div className={GRID}>
        {Array.from({ length: KPI_COUNT }, (_, index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className={GRID}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-1) px-4 py-3">
      <div className={cn("absolute inset-x-0 top-0 h-rule", RULE_COLOR[kpi.tone])} />

      <div className="text-xs font-semibold uppercase tracking-label text-(--color-fg-subtle)">
        {kpi.label}
      </div>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className={cn("text-3xl leading-none font-mono font-semibold tabular-nums", VALUE_COLOR[kpi.tone])}>
          {kpi.value}
        </span>
        {kpi.sub ? <span className="text-xs font-mono text-(--color-fg-subtle)">{kpi.sub}</span> : null}
      </div>
    </div>
  );
}
