import { describe, it, expect, beforeEach } from "vitest";
import { useFiltersStore } from "@/lib/stores/filters-store";
import { applyFilters } from "./model-table";
import type { ModelStats } from "@/lib/types";

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
