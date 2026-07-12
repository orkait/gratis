"use client";
import { useCallback } from "react";
import { useFiltersStore } from "@/stores/filters-store";
import type { SliderSpec, ToggleSpec } from "../lib/filter-config";

/** Stable, typed handlers for the filter panel.
 *
 * The panel renders a list of specs, so without this every row would build a fresh closure on every
 * keystroke. Keeping them here also means the components stay presentational: they receive a
 * function and a value, and know nothing about the store.
 */
export function useFilterHandlers() {
  const setFilter = useFiltersStore((s) => s.setFilter);
  const resetFilters = useFiltersStore((s) => s.resetFilters);

  const setBoolean = useCallback(
    (key: ToggleSpec["key"], next: boolean) => setFilter(key, next),
    [setFilter],
  );

  const setNumber = useCallback(
    (key: SliderSpec["key"], next: number) => setFilter(key, next),
    [setFilter],
  );

  const setSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => setFilter("search", event.target.value),
    [setFilter],
  );

  const reset = useCallback(() => resetFilters(), [resetFilters]);

  return { setBoolean, setNumber, setSearch, reset };
}
