"use client";
import { Heart, FlaskConical } from "lucide-react";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { InfoTip } from "@/components/ui/info-tip";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { displayName, formatParams } from "../lib/format";

const CONFIDENCE_DOT: Readonly<Record<string, string>> = {
  high: "bg-(--color-success)",
  medium: "bg-(--color-fg-subtle)/60",
  low: "bg-(--color-warning)",
};

/** The honesty signals: where the benchmarks and the humans disagree, and how much to trust either. */
const DIVERGENCE = {
  humanFavored: "human-favored",
  benchFavored: "bench-favored",
} as const;

export function ModelCell({ model, showHonesty }: { model: ModelStats; showHonesty: boolean }) {
  const params = model.params >= 1 ? formatParams(model.params) : "?";

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center text-xs font-mono font-semibold text-(--color-fg-muted) shrink-0">
        {params}
      </div>

      <div className="min-w-0">
        <div className="text-sm font-medium truncate flex items-center gap-2">
          {showHonesty && model.confidence ? <ConfidenceDot confidence={model.confidence} /> : null}
          <span className="truncate">{displayName(model.id)}</span>
          {model.archetype ? <ArchetypeTag archetype={model.archetype} /> : null}
          {showHonesty ? <DivergenceTag model={model} /> : null}
        </div>

        <div className="text-xs text-(--color-fg-subtle) flex items-center gap-1.5">
          <ProviderAvatar provider={model.provider} size="xs" />
          {model.provider}
          {showHonesty ? <BenchmarkGrounding model={model} /> : null}
        </div>
      </div>
    </div>
  );
}

function ConfidenceDot({ confidence }: { confidence: string }) {
  return (
    <InfoTip content={`${confidence} confidence, from benchmark coverage + cross-benchmark agreement`}>
      <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", CONFIDENCE_DOT[confidence])} />
    </InfoTip>
  );
}

function ArchetypeTag({ archetype }: { archetype: string }) {
  return (
    <span className="text-2xs uppercase tracking-wide font-mono px-1.5 py-px rounded bg-(--color-surface-2) text-(--color-fg-subtle) shrink-0">
      {archetype}
    </span>
  );
}

/** Two independent early returns instead of two chained conditionals inside the parent's JSX. */
function DivergenceTag({ model }: { model: ModelStats }) {
  if (model.divergence === DIVERGENCE.humanFavored) {
    return (
      <InfoTip content={`Humans rate this above its benchmarks (Elo ${model.arena_elo}). Trust the crowd for chat.`}>
        <span className="inline-flex items-center gap-1 text-2xs font-mono px-1.5 py-px rounded bg-(--color-success)/15 text-(--color-success) shrink-0">
          <Heart className="w-2.5 h-2.5" />
          humans
        </span>
      </InfoTip>
    );
  }

  if (model.divergence === DIVERGENCE.benchFavored) {
    return (
      <InfoTip content={`Benchmarks rate this above human preference (Elo ${model.arena_elo}). Great scores, humans less sold.`}>
        <span className="inline-flex items-center gap-1 text-2xs font-mono px-1.5 py-px rounded bg-(--color-warning)/15 text-(--color-warning) shrink-0">
          <FlaskConical className="w-2.5 h-2.5" />
          benches
        </span>
      </InfoTip>
    );
  }

  return null;
}

function BenchmarkGrounding({ model }: { model: ModelStats }) {
  if (model.bench_count == null || model.bench_count <= 0) return null;

  const agreement = model.consensus == null ? "" : `, ${model.consensus.toFixed(0)}% agree`;
  const tip =
    model.consensus == null
      ? `Grounded in ${model.bench_count} community benchmarks`
      : `Grounded in ${model.bench_count} community benchmarks, ${model.consensus.toFixed(0)}% cross-benchmark agreement (low agreement = a contested score)`;

  return (
    <InfoTip content={tip}>
      <span className="text-xs font-mono text-(--color-fg-subtle)/70">
        · {model.bench_count} benches{agreement}
      </span>
    </InfoTip>
  );
}
