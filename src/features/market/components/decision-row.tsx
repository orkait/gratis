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

/** The four signals shown inline on every decision row. */
export const DECISION_SIGNALS = [
  { key: "intelligence", label: "Intel" },
  { key: "coding", label: "Code" },
  { key: "tool_use", label: "Tools" },
  { key: "speed", label: "Fast" },
] as const;

type DecisionRowProps = {
  model: ModelStats;
  rank: number;
  active: boolean;
  metricKey: string;
  onOpen: (id: string) => void;
  onChat: (id: string) => void;
};

/** Memoized: opening the drawer flips `active` on at most two rows, and without this the whole
 * tooltip-heavy body re-rendered on every click (~200ms, the UI visibly froze). The handlers passed
 * in MUST stay referentially stable or this memo is worthless. */
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
      <TD className="text-right pr-3 font-mono text-[11px] text-(--color-fg-subtle) tabular-nums">{rank}</TD>

      <TD>
        <ModelCell model={model} showHonesty />
      </TD>

      <TD>
        <div className="flex items-center gap-2">
          <span className="text-[18px] leading-none font-semibold tabular-nums text-(--color-accent) w-8 text-right">
            {formatScore(headline)}
          </span>
          <div className="flex-1">
            <ScoreBar value={headline} />
          </div>
        </div>
      </TD>

      <TD>
        <div className="flex gap-3">
          {DECISION_SIGNALS.map((signal) => (
            <SignalMeter key={signal.key} label={signal.label} value={scoreOf(model, signal.key)} />
          ))}
        </div>
      </TD>

      <TD>
        <PreferenceSplit model={model} />
      </TD>

      <TD className="text-right">
        <span
          className={cn(
            "text-[11px] font-mono tabular-nums",
            model.is_free ? "text-(--color-success)" : "text-(--color-fg-muted)",
          )}
        >
          {price ?? "-"}
        </span>
      </TD>

      <TD className="text-center">
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
    <div className="w-14">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[8px] font-mono uppercase tracking-wide text-(--color-fg-subtle)/70">{label}</span>
        <span className="text-[9px] font-mono tabular-nums text-(--color-fg-muted)">{formatScore(value)}</span>
      </div>
      <ScoreBar value={value} tone="muted" />
    </div>
  );
}

/** Benchmark composite (B) against human-preference Elo (H) - the honest triangulation. */
function PreferenceSplit({ model }: { model: ModelStats }) {
  if (model.preference == null) {
    return <span className="text-[10px] font-mono text-(--color-fg-subtle)/50">no votes</span>;
  }

  return (
    <div className="space-y-1 w-24">
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-mono w-2.5 text-(--color-fg-subtle)">B</span>
        <ScoreBar value={model.scores?.overall} tone="accent" />
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-[8px] font-mono w-2.5 text-(--color-fg-subtle)">H</span>
        <ScoreBar value={model.preference} tone="human" />
      </div>
    </div>
  );
}
