"use client";
import { useMemo } from "react";
import type { ModelStats } from "@/types/model";

export type KpiTone = "accent" | "success" | "neutral";

export type Kpi = {
  readonly label: string;
  readonly value: string;
  readonly sub?: string;
  readonly tone: KpiTone;
};

const PERCENT = 100;

function median(sorted: readonly number[]): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function highest(sorted: readonly number[]): number {
  return sorted[sorted.length - 1] ?? 0;
}

/** The KPI arithmetic, lifted out of the component: the strip renders a list, it does not compute
 * statistics. Recomputed only when the model set actually changes. */
export function useMarketKpis(models: readonly ModelStats[]): Kpi[] {
  return useMemo(() => {
    const total = models.length;
    const free = models.filter((m) => m.is_free).length;
    const providers = new Set(models.map((m) => m.provider)).size;
    const rated = models.filter((m) => m.arena_elo != null).length;

    const overalls = models
      .map((m) => m.scores?.overall)
      .filter((value): value is number => value != null)
      .sort((a, b) => a - b);

    const freeShare = total > 0 ? `${Math.round((free / total) * PERCENT)}%` : undefined;
    const humanRated = rated > 0 ? `${rated} human-rated` : undefined;

    return [
      { label: "Models", value: String(total), tone: "neutral" },
      { label: "Free to run", value: String(free), sub: freeShare, tone: "success" },
      { label: "Providers", value: String(providers), tone: "neutral" },
      { label: "Median score", value: median(overalls).toFixed(0), sub: "of 100", tone: "accent" },
      { label: "Top score", value: highest(overalls).toFixed(0), sub: humanRated, tone: "accent" },
    ];
  }, [models]);
}
