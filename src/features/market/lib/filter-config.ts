import { Brain, Wrench, type LucideIcon } from "lucide-react";
import type { Filters } from "@/stores/filters-store";

/** The filter panel is data-driven, and its keys are derived FROM the store's type - so a filter
 * that no longer exists, or one whose type changes from boolean to number, is a compile error here
 * rather than a control that silently does nothing. */

type BooleanFilterKey = { [K in keyof Filters]: Filters[K] extends boolean ? K : never }[keyof Filters];
type NumericFilterKey = { [K in keyof Filters]: Filters[K] extends number ? K : never }[keyof Filters];

export type ToggleSpec = {
  readonly key: BooleanFilterKey;
  readonly label: string;
};

export type ChipSpec = ToggleSpec & {
  readonly icon: LucideIcon;
};

export type SliderSpec = {
  readonly key: NumericFilterKey;
  readonly label: string;
  readonly max: number;
  readonly step: number;
  readonly suffix: string;
  readonly display: (value: number) => number;
};

const identity = (value: number): number => value;
const toThousands = (value: number): number => Math.round(value / 1000);

export const TIER_FILTERS: readonly ToggleSpec[] = [
  { key: "freeOnly", label: "Free only" },
  { key: "openOnly", label: "Open source" },
];

export const CAPABILITY_FILTERS: readonly ChipSpec[] = [
  { key: "brain", label: "Brain", icon: Brain },
  { key: "tools", label: "Tools", icon: Wrench },
];

export const HARDWARE_SLIDERS: readonly SliderSpec[] = [
  { key: "minParams", label: "Min Params", max: 500, step: 1, suffix: "B", display: identity },
  { key: "minCtx", label: "Min Context", max: 1_000_000, step: 8_000, suffix: "K", display: toThousands },
];
