"use client";
import { memo } from "react";
import { MessageSquare } from "lucide-react";
import { TR, TD } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { priceLabel, scoreOf } from "../lib/scores";
import { useRowActivation } from "../hooks/use-row-activation";
import { ScoreBar } from "./score-bar";
import { ModelCell } from "./model-cell";

/** The signals shown inline on every row.
 *
 * "FAST" is deliberately absent. `speed` is a provider-class PRIOR for every model in the pool - not
 * one reports measured throughput - so it rendered as an identical "FAST 50" on nearly every row:
 * three characters of noise pretending to be a measurement. It still drives the "Fastest" lens,
 * where a ranking prior is a legitimate use of it; it just is not presented as evidence.
 */
export const DECISION_SIGNALS = [
  { key: "intelligence", label: "Intel" },
  { key: "coding", label: "Code" },
  { key: "tool_use", label: "Tools" },
] as const;

type DecisionRowProps = {
  model: ModelStats;
  rank: number;
  active: boolean;
  metricKey: string;
  onOpen: (id: string) => void;
  onChat: (id: string) => void;
};

export const DecisionRow = memo(function DecisionRow({
  model,
  rank,
  active,
  metricKey,
  onOpen,
  onChat,
}: DecisionRowProps) {
  const { activate, handleKeyDown, handleChat } = useRowActivation(model.id, onOpen, onChat);
  const headline = scoreOf(model, metricKey);
  const price = priceLabel(model);

  return (
    <TR
      role="button"
      tabIndex={0}
      aria-label={`Details for ${model.id}`}
      onClick={activate}
      onKeyDown={handleKeyDown}
      className={cn("cursor-pointer", active && "bg-(--color-accent-soft) border-l-2 border-l-(--color-accent)")}
    >
      <TD className="w-10 text-right pr-3 font-mono text-xs text-(--color-fg-subtle) tabular-nums">{rank}</TD>

      <TD className="w-col-model max-w-col-model">
        <ModelCell model={model} showHonesty />
      </TD>

      <TD className="w-col-score">
        <div className="flex items-center gap-2.5">
          <span className="w-8 shrink-0 text-right text-xl leading-none font-semibold tabular-nums text-(--color-accent)">
            {formatScore(headline)}
          </span>
          <ScoreBar value={headline} />
        </div>
      </TD>

      {/* The signals get the width the model name and two dead columns used to waste. */}
      <TD>
        <div className="flex gap-4">
          {DECISION_SIGNALS.map((signal) => (
            <SignalMeter key={signal.key} label={signal.label} value={scoreOf(model, signal.key)} />
          ))}
        </div>
      </TD>

      <TD className="w-col-cost text-right">
        <span
          className={cn(
            "text-xs font-mono tabular-nums",
            model.is_free ? "text-(--color-success) font-semibold" : "text-(--color-fg-muted)",
          )}
        >
          {price ?? "-"}
        </span>
      </TD>

      <TD className="w-12 text-center">
        <Button variant="ghost" size="icon" onClick={handleChat} aria-label="Open chat">
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
      </TD>
    </TR>
  );
});

function formatScore(value: number | undefined): string {
  if (value == null) return "-";
  return value.toFixed(0);
}

function SignalMeter({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex-1 min-w-signal-min max-w-signal-max">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs font-mono uppercase tracking-wide text-(--color-fg-subtle)/70">{label}</span>
        <span className="text-2xs font-mono tabular-nums text-(--color-fg-muted)">{formatScore(value)}</span>
      </div>
      <ScoreBar value={value} tone="muted" />
    </div>
  );
}
