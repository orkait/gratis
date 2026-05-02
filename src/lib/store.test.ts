import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";

describe("useStore", () => {
  beforeEach(() => useStore.getState().resetFilters());

  it("toggles sort direction when same column reselected", () => {
    useStore.getState().setSort("tps");
    expect(useStore.getState().sort).toEqual({ col: "tps", desc: true });
    useStore.getState().setSort("tps");
    expect(useStore.getState().sort.desc).toBe(false);
  });

  it("resets desc=true when changing column", () => {
    useStore.getState().setSort("tps");
    useStore.getState().setSort("tps"); // desc = false
    useStore.getState().setSort("ctx");
    expect(useStore.getState().sort).toEqual({ col: "ctx", desc: true });
  });

  it("setFilter mutates only the named key", () => {
    useStore.getState().setFilter("freeOnly", true);
    expect(useStore.getState().filters.freeOnly).toBe(true);
    expect(useStore.getState().filters.openOnly).toBe(false);
  });
});
