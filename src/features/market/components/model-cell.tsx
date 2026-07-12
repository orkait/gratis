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

const DIVERGENCE = {
  humanFavored: "human-favored",
  benchFavored: "bench-favored",
} as const;

/** The model identity cell.
 *
 * It used to eat over half the table width to show a name plus a line of prose ("9 benches, 55%
 * agree") that repeated on every row and told you nothing you could act on. The grounding is now
 * folded into the confidence dot's tooltip, where it is available but not shouting, and the cell is
 * a fixed width so the actual signal gets the room.
 */
export function ModelCell({ model, showHonesty }: { model: ModelStats; showHonesty: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        {showHonesty && model.confidence ? <ConfidenceDot model={model} /> : null}
        <span className="text-sm font-medium truncate">{displayName(model.id)}</span>
        <ParamBadge params={model.params} />
        {model.archetype ? <ArchetypeTag archetype={model.archetype} /> : null}
        {showHonesty ? <DivergenceTag model={model} /> : null}
      </div>

      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-(--color-fg-subtle) truncate">
        <ProviderAvatar provider={model.provider} size="xs" />
        <span className="truncate">{model.provider}</span>
      </div>
    </div>
  );
}

/** An inline chip, present only when the size is actually known - NOT a reserved gutter.
 *
 * Two mistakes were stacked here. First the backend defaulted an unparseable size to 1.0, so every
 * row claimed "1B" (Claude Opus is not a 1B model). Fixing that left 190 of 270 models with no size
 * at all - and this component still reserved a 36px slot for each of them, so nearly every row
 * carried an empty box between the rank and the name.
 *
 * You cannot reserve a column for data that mostly does not exist. It is a chip beside the name
 * now: it appears when we know the size, and takes no space at all when we do not.
 */
function ParamBadge({ params }: { params: number | null }) {
  if (params == null) return null;

  return (
    <span className="shrink-0 rounded-sm bg-(--color-surface-2) border border-(--color-border) px-1.5 py-px text-2xs font-mono font-semibold text-(--color-fg-muted) tabular-nums">
      {formatParams(params)}
    </span>
  );
}

/** The benchmark grounding now lives here instead of as a line of prose on every row. */
function ConfidenceDot({ model }: { model: ModelStats }) {
  const grounding = groundingText(model);

  return (
    <InfoTip content={grounding}>
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full shrink-0",
          CONFIDENCE_DOT[model.confidence ?? "medium"],
        )}
      />
    </InfoTip>
  );
}

function groundingText(model: ModelStats): string {
  const parts = [`${model.confidence} confidence`];
  if (model.bench_count != null && model.bench_count > 0) {
    parts.push(`grounded in ${model.bench_count} community benchmarks`);
  }
  if (model.consensus != null) {
    parts.push(`${model.consensus.toFixed(0)}% cross-benchmark agreement (low agreement = a contested score)`);
  }
  return parts.join(" · ");
}

function ArchetypeTag({ archetype }: { archetype: string }) {
  return (
    <span className="text-2xs uppercase tracking-wide font-mono px-1.5 py-px rounded bg-(--color-surface-2) text-(--color-fg-subtle) shrink-0">
      {archetype}
    </span>
  );
}

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
