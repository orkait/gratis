"use client";
import { Sparkles, Code2, Wrench, Brain, Coins, Zap } from "lucide-react";
import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import { Toggle } from "@base-ui-components/react/toggle";
import { useFiltersStore, type Lens } from "@/lib/stores/filters-store";
import { cn } from "@/lib/utils";

const LENSES: { id: Lens; label: string; hint: string; icon: typeof Sparkles }[] = [
  { id: "overall", label: "Best overall", hint: "quality · human-aligned", icon: Sparkles },
  { id: "code", label: "Coding", hint: "LiveCodeBench · terminal", icon: Code2 },
  { id: "agent", label: "Agents & tools", hint: "τ-bench · tool-use", icon: Wrench },
  { id: "reasoning", label: "Reasoning", hint: "GPQA · HLE", icon: Brain },
  { id: "budget", label: "Cheapest good", hint: "value per dollar", icon: Coins },
  { id: "fast", label: "Fastest", hint: "throughput", icon: Zap },
];

export function TaskLens() {
  const { lens, setLens, view, setView } = useFiltersStore();
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-(--color-fg-subtle)">
          What are you building?
        </div>
        <ToggleGroup
          value={[view]}
          onValueChange={(v) => { if (v[0]) setView(v[0] as "decision" | "detailed"); }}
          className="flex items-center gap-0.5 p-0.5 rounded-md border border-(--color-border) bg-(--color-surface-1)"
        >
          {(["decision", "detailed"] as const).map((v) => (
            <Toggle
              key={v}
              value={v}
              className={cn(
                "h-6 px-2.5 rounded text-[10px] font-mono uppercase tracking-wide cursor-pointer transition-colors duration-150",
                "text-(--color-fg-subtle) hover:text-(--color-fg)",
                "data-[pressed]:bg-(--color-accent-soft) data-[pressed]:text-(--color-accent)",
              )}
            >
              {v === "decision" ? "Decide" : "Audit"}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>
      <ToggleGroup
        value={[lens]}
        onValueChange={(v) => { if (v[0]) setLens(v[0] as Lens); }}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5"
      >
        {LENSES.map(({ id, label, hint, icon: Icon }) => (
          <Toggle
            key={id}
            value={id}
            className={cn(
              "group flex flex-col gap-1 items-start text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150",
              "border-(--color-border) bg-(--color-surface-1) hover:border-(--color-fg-subtle)/40 hover:bg-(--color-surface-2)",
              "data-[pressed]:border-(--color-accent) data-[pressed]:bg-(--color-accent-soft)",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40",
            )}
          >
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-(--color-fg-subtle) group-data-[pressed]:text-(--color-accent)" />
              <span className="text-[12px] font-medium text-(--color-fg) group-data-[pressed]:text-(--color-accent)">{label}</span>
            </div>
            <span className="text-[10px] font-mono text-(--color-fg-subtle)/80">{hint}</span>
          </Toggle>
        ))}
      </ToggleGroup>
    </div>
  );
}
