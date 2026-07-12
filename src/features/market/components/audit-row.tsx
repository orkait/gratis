"use client";
import { memo } from "react";
import { Brain, Wrench, BookOpen, Lock, MessageSquare } from "lucide-react";
import { TR, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { priceLabel, scoreOf } from "../lib/scores";
import { useRowActivation } from "../hooks/use-row-activation";
import { ModelCell } from "./model-cell";

const HEADLINE_SCORE = "overall";

type AuditRowProps = {
  model: ModelStats;
  rank: number;
  active: boolean;
  scoreKeys: readonly string[];
  onOpen: (id: string) => void;
  onChat: (id: string) => void;
};

/** Memoized for the same reason as DecisionRow: the audit view renders every score dimension, so an
 * unmemoized body is the most expensive thing on the page. */
export const AuditRow = memo(function AuditRow({ model, rank, active, scoreKeys, onOpen, onChat }: AuditRowProps) {
  const { activate, handleKeyDown, handleChat } = useRowActivation(model.id, onOpen, onChat);

  return (
    <TR
      role="button"
      tabIndex={0}
      aria-label={`Details for ${model.id}`}
      onClick={activate}
      onKeyDown={handleKeyDown}
      className={cn("cursor-pointer", active && "bg-(--color-accent-soft) border-l-2 border-l-(--color-accent)")}
    >
      <TD className="text-right pr-4 font-mono text-xs text-(--color-fg-subtle)">{rank}</TD>

      <TD>
        <ModelCell model={model} showHonesty />
      </TD>

      <TD>
        <TierCell model={model} />
      </TD>

      <TD>
        <CapabilityCell model={model} />
      </TD>

      {scoreKeys.map((key) => (
        <ScoreCell key={key} value={scoreOf(model, key)} headline={key === HEADLINE_SCORE} />
      ))}

      <TD className="text-center">
        <Button variant="ghost" size="icon" onClick={handleChat} aria-label="Open chat">
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
      </TD>
    </TR>
  );
});

function TierCell({ model }: { model: ModelStats }) {
  const price = priceLabel(model);

  return (
    <div className="flex flex-col gap-0.5">
      {model.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>}
      {!model.is_free && price ? (
        <span className="text-xs font-mono text-(--color-fg-subtle) tabular-nums">{price}</span>
      ) : null}
    </div>
  );
}

function CapabilityCell({ model }: { model: ModelStats }) {
  return (
    <div className="flex items-center gap-1.5">
      {model.brain ? (
        <Badge variant="accent">
          <Brain className="w-2.5 h-2.5" />
          IQ
        </Badge>
      ) : null}
      {model.tools ? (
        <Badge variant="info">
          <Wrench className="w-2.5 h-2.5" />
          TOOL
        </Badge>
      ) : null}
      {model.open ? (
        <BookOpen className="w-3 h-3 text-(--color-fg-subtle)" />
      ) : (
        <Lock className="w-3 h-3 text-(--color-fg-subtle)/40" />
      )}
    </div>
  );
}

function ScoreCell({ value, headline }: { value: number | undefined; headline: boolean }) {
  const tone = headline
    ? "text-(--color-accent) font-semibold text-sm"
    : "text-(--color-fg-muted)";

  return (
    <TD className={cn("text-right font-mono text-sm tabular-nums", tone)}>
      {value == null ? <span className="text-(--color-fg-disabled)">-</span> : value.toFixed(0)}
    </TD>
  );
}
