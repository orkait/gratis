import { describe, it, expect, beforeEach } from "vitest";
import { useFiltersStore } from "@/stores/filters-store";
import { LENSES } from "./lens-config";

beforeEach(() => {
  useFiltersStore.getState().resetFilters();
});

describe("a free-model market opens on free models", () => {
  it("defaults to free-only", () => {
    // The market used to open on $50/M and $150/M models, in a tool whose entire premise is running
    // LLMs for nothing.
    expect(useFiltersStore.getState().filters.freeOnly).toBe(true);
  });

  it("resetting filters returns to free-only, not to everything", () => {
    useFiltersStore.getState().setFilter("freeOnly", false);
    useFiltersStore.getState().resetFilters();
    expect(useFiltersStore.getState().filters.freeOnly).toBe(true);
  });

  it("is still a toggle - the paid comparison is one click away", () => {
    useFiltersStore.getState().setFilter("freeOnly", false);
    expect(useFiltersStore.getState().filters.freeOnly).toBe(false);
  });
});

describe("lenses that rank on inferred data say so", () => {
  it("the Fastest lens is marked estimated", () => {
    // speed_est is true for 270 of 270 live models: no provider reports measured throughput, so
    // this lens ranks on a provider-class prior. Presenting that silently would be a claim we
    // cannot back.
    const fast = LENSES.find((lens) => lens.id === "fast");
    expect(fast?.estimated).toBeTruthy();
  });

  it("lenses grounded in real benchmarks are NOT marked estimated", () => {
    for (const id of ["overall", "code", "agent", "reasoning"] as const) {
      expect(LENSES.find((lens) => lens.id === id)?.estimated).toBeUndefined();
    }
  });
});
