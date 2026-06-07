import { describe, it, expect, beforeEach } from "vitest";
import { useFiltersStore } from "./filters-store";

describe("filters-store", () => {
  beforeEach(() => {
    useFiltersStore.getState().resetFilters();
    useFiltersStore.setState({ sort: { col: "balanced", desc: true }, page: 1, pageSize: 50 });
  });

  it("toggles sort direction when same column reselected", () => {
    useFiltersStore.getState().setSort("tps");
    expect(useFiltersStore.getState().sort).toEqual({ col: "tps", desc: true });
    useFiltersStore.getState().setSort("tps");
    expect(useFiltersStore.getState().sort.desc).toBe(false);
  });

  it("resets desc=true when changing column", () => {
    useFiltersStore.getState().setSort("tps");
    useFiltersStore.getState().setSort("tps"); // desc = false
    useFiltersStore.getState().setSort("ctx");
    expect(useFiltersStore.getState().sort).toEqual({ col: "ctx", desc: true });
  });

  it("setFilter mutates only the named key and resets page", () => {
    useFiltersStore.getState().setPage(3);
    useFiltersStore.getState().setFilter("freeOnly", true);
    expect(useFiltersStore.getState().filters.freeOnly).toBe(true);
    expect(useFiltersStore.getState().filters.openOnly).toBe(false);
    expect(useFiltersStore.getState().page).toBe(1);
  });

  it("clamps page to >= 1", () => {
    useFiltersStore.getState().setPage(-5);
    expect(useFiltersStore.getState().page).toBe(1);
  });
});
