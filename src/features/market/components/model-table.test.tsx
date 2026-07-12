import { describe, it, expect, beforeEach } from "vitest";
import { useFiltersStore } from "@/stores/filters-store";
import { applyFilters } from "../lib/filtering";
import { sortValue } from "../lib/scores";
import { buildColumns } from "../lib/columns";
import type { ModelStats } from "@/types/model";

const M = (overrides: Partial<ModelStats>): ModelStats => ({
  id: "x/y", name: "y", params: 1, ctx: 1, is_free: false,
  capability: 0, brain: false, tools: false, open: false,
  tps: null, uptime: null, provider: "OpenRouter", balanced: 0, value: 0,
  intel: null, intel_coding: null, intel_math: null, intel_est: true,
  ...overrides,
});

describe("applyFilters", () => {
  beforeEach(() => useFiltersStore.getState().resetFilters());

  it("filters by provider=ollama matching by provider field", () => {
    const models = [M({ id: "a", provider: "Ollama" }), M({ id: "b", provider: "Groq" })];
    useFiltersStore.getState().setFilter("provider", "ollama");
    expect(applyFilters(models, useFiltersStore.getState().filters).map((m) => m.id)).toEqual(["a"]);
  });

  it("freeOnly excludes paid models", () => {
    const models = [M({ id: "a", is_free: true }), M({ id: "b", is_free: false })];
    useFiltersStore.getState().setFilter("freeOnly", true);
    expect(applyFilters(models, useFiltersStore.getState().filters).map((m) => m.id)).toEqual(["a"]);
  });

  it("search matches model id substring case-insensitive", () => {
    const models = [M({ id: "groq/llama-3" }), M({ id: "openai/gpt-4" })];
    useFiltersStore.getState().setFilter("search", "LLAMA");
    expect(applyFilters(models, useFiltersStore.getState().filters).map((m) => m.id)).toEqual(["groq/llama-3"]);
  });
});

describe("sortValue", () => {
  it("maps is_free to 1/0 so free sorts above paid on desc", () => {
    expect(sortValue(M({ is_free: true }), "is_free")).toBe(1);
    expect(sortValue(M({ is_free: false }), "is_free")).toBe(0);
  });

  it("weights caps brain>tools>open into a single sortable number", () => {
    expect(sortValue(M({ brain: true, tools: true, open: true }), "caps")).toBe(7);
    expect(sortValue(M({ brain: true }), "caps")).toBe(4);
    expect(sortValue(M({ tools: true }), "caps")).toBe(2);
    expect(sortValue(M({ open: true }), "caps")).toBe(1);
    expect(sortValue(M({}), "caps")).toBe(0);
  });

  it("reads a scores dimension by key", () => {
    const m = M({ scores: { overall: 82, coding: 71 } } as Partial<ModelStats>);
    expect(sortValue(m, "overall")).toBe(82);
    expect(sortValue(m, "coding")).toBe(71);
  });

  it("returns undefined (not null) for a missing dimension so TanStack pushes it last", () => {
    expect(sortValue(M({}), "overall")).toBeUndefined();
    expect(sortValue(M({ scores: { overall: 5 } } as Partial<ModelStats>), "coding")).toBeUndefined();
  });

  it("passes the model id through as a string for text sort", () => {
    expect(sortValue(M({ id: "groq/llama-3" }), "id")).toBe("groq/llama-3");
  });
});

describe("buildColumns", () => {
  it("prepends id/tier/caps then appends the dynamic score keys in order", () => {
    expect(buildColumns(["overall", "intelligence"]).map((c) => c.id)).toEqual([
      "id", "is_free", "caps", "overall", "intelligence",
    ]);
  });

  it("dedupes score keys already covered and keeps a stable universe", () => {
    expect(buildColumns([]).map((c) => c.id)).toEqual(["id", "is_free", "caps"]);
    expect(buildColumns(["overall", "overall", "coding"]).map((c) => c.id)).toEqual([
      "id", "is_free", "caps", "overall", "coding",
    ]);
  });

  it("gives every score column a numeric accessor that reads scoreValue", () => {
    const cols = buildColumns(["overall"]);
    const overall = cols.find((c) => c.id === "overall")!;
    const acc = (overall as { accessorFn: (m: ModelStats, i: number) => unknown }).accessorFn;
    expect(acc(M({ scores: { overall: 90 } } as Partial<ModelStats>), 0)).toBe(90);
    expect(acc(M({}), 0)).toBeUndefined();
  });
});
