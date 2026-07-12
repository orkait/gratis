import type { SortCol } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

/** Score dimensions, in display order. A dimension the backend stops sending simply disappears;
 * one it starts sending shows up automatically, appended after the known order. */
export const SCORE_ORDER = [
  "overall", "intelligence", "coding", "reasoning", "math", "tool_use", "knowledge", "instruction",
  "speed", "value", "affordability", "context", "reliability",
  "fit_chat", "fit_code", "fit_math", "fit_agent", "fit_budget", "fit_fast",
] as const;

const SCORE_LABEL: Readonly<Record<string, string>> = {
  overall: "Overall", intelligence: "Intel", tool_use: "Tools", affordability: "Cheap",
  reliability: "Uptime", instruction: "Instruct", knowledge: "Know",
  fit_chat: "Chat", fit_code: "Code", fit_math: "Math",
  fit_agent: "Agent", fit_budget: "Budget", fit_fast: "Fast",
};

/** Columns that are computed rather than read straight off a score. */
const DERIVED_COLUMNS = {
  free: "is_free",
  capabilities: "caps",
  id: "id",
} as const;

const CAPABILITY_WEIGHT = { brain: 4, tools: 2, open: 1 } as const;

export function scoreOf(model: ModelStats, key: string): number | undefined {
  if (!model.scores) return undefined;
  const value = (model.scores as Record<string, number>)[key];
  return value ?? undefined;
}

/** Comparable value for one column. Returns `undefined` (never null) for a missing dimension so
 * TanStack's `sortUndefined: "last"` pushes blanks to the bottom in BOTH sort directions. */
export function sortValue(model: ModelStats, col: SortCol): number | string | undefined {
  if (col === DERIVED_COLUMNS.free) return model.is_free ? 1 : 0;
  if (col === DERIVED_COLUMNS.capabilities) return capabilityRank(model);
  if (col === DERIVED_COLUMNS.id) return model.id;

  const score = scoreOf(model, col);
  if (score !== undefined) return score;

  const raw = (model as unknown as Record<string, number | string | null | undefined>)[col];
  return raw ?? undefined;
}

function capabilityRank(model: ModelStats): number {
  let rank = 0;
  if (model.brain) rank += CAPABILITY_WEIGHT.brain;
  if (model.tools) rank += CAPABILITY_WEIGHT.tools;
  if (model.open) rank += CAPABILITY_WEIGHT.open;
  return rank;
}

/** Every score dimension present in the data, ordered. Data-driven: a new backend dimension needs
 * no frontend change to appear and sort. */
export function deriveScoreKeys(models: readonly ModelStats[]): string[] {
  const seen = new Set<string>();
  for (const model of models) {
    if (!model.scores) continue;
    for (const key of Object.keys(model.scores)) seen.add(key);
  }
  const known = SCORE_ORDER.filter((key) => seen.has(key));
  const unknown = [...seen].filter((key) => !SCORE_ORDER.includes(key as (typeof SCORE_ORDER)[number])).sort();
  return [...known, ...unknown];
}

export function labelFor(key: string): string {
  const known = SCORE_LABEL[key];
  if (known) return known;
  return key
    .replace(/^fit_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

const PER_MILLION = 1_000_000;

/** Price per million output tokens, or null when there is nothing honest to show. */
export function priceLabel(model: ModelStats): string | null {
  if (model.is_free) return "free";
  if (!model.price_out) return null;
  const perMillion = model.price_out * PER_MILLION;
  const precision = perMillion >= 1 ? 1 : 2;
  return `$${perMillion.toFixed(precision)}/M`;
}

export { DERIVED_COLUMNS };
