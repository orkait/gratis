import { describe, it, expect, beforeEach } from "vitest";
import { useFiltersStore } from "@/stores/filters-store";
import { LENSES } from "./lens-config";
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from "@/config/ui";

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

describe("page size", () => {
  it("offers 25 and defaults to it", () => {
    expect(PAGE_SIZES).toContain(25);
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    expect(useFiltersStore.getState().pageSize).toBe(25);
  });

  it("keeps the denser options available", () => {
    expect(PAGE_SIZES).toEqual([25, 50, 100, 200]);
  });

  it("the store accepts every size the config offers", () => {
    // The store used to hand-declare `PageSize = 50 | 100 | 200`, so adding a size to the config
    // alone would have left the store rejecting it. The type is derived now.
    for (const size of PAGE_SIZES) {
      useFiltersStore.getState().setPageSize(size);
      expect(useFiltersStore.getState().pageSize).toBe(size);
    }
  });

  it("changing page size returns to page 1", () => {
    useFiltersStore.getState().setPage(4);
    useFiltersStore.getState().setPageSize(100);
    expect(useFiltersStore.getState().page).toBe(1);
  });
});
