import { Sparkles, Code2, Wrench, Brain, Coins, Zap, type LucideIcon } from "lucide-react";
import type { Lens, ViewMode } from "@/stores/filters-store";

/** "What are you building?" - the decision lenses. Keyed by the store's Lens type, so a lens that
 * is added or removed there is a compile error here rather than a silently missing card. */
export type LensSpec = {
  readonly id: Lens;
  readonly label: string;
  readonly hint: string;
  readonly icon: LucideIcon;
};

export const LENSES: readonly LensSpec[] = [
  { id: "overall", label: "Best overall", hint: "quality · human-aligned", icon: Sparkles },
  { id: "code", label: "Coding", hint: "LiveCodeBench · terminal", icon: Code2 },
  { id: "agent", label: "Agents & tools", hint: "τ-bench · tool-use", icon: Wrench },
  { id: "reasoning", label: "Reasoning", hint: "GPQA · HLE", icon: Brain },
  { id: "budget", label: "Cheapest good", hint: "value per dollar", icon: Coins },
  { id: "fast", label: "Fastest", hint: "throughput", icon: Zap },
];

export type ViewSpec = {
  readonly id: ViewMode;
  readonly label: string;
};

/** The label was an inline `v === "decision" ? "Decide" : "Audit"` in JSX. */
export const VIEW_MODES: readonly ViewSpec[] = [
  { id: "decision", label: "Decide" },
  { id: "detailed", label: "Audit" },
];
