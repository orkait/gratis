import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBrowserStorage } from "./storage";
import type { ProviderFilter } from "@/lib/types";

export type SortCol =
  | "balanced" | "value" | "tps" | "ctx" | "params" | "id" | "is_free" | "caps" | "intel";

export type PageSize = 50 | 100 | 200;

export type Filters = {
  freeOnly: boolean;
  openOnly: boolean;
  brain: boolean;
  tools: boolean;
  minParams: number;
  minCtx: number;
  search: string;
  provider: ProviderFilter;
};

const DEFAULT_FILTERS: Filters = {
  freeOnly: false, openOnly: false, brain: false, tools: false,
  minParams: 0, minCtx: 0, search: "", provider: "all",
};

/** Model-market query state. Moves to URL (nuqs) in the next phase; zustand for now. */
type FiltersState = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  sort: { col: SortCol; desc: boolean };
  setSort: (col: SortCol) => void;
  page: number;
  pageSize: PageSize;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v }, page: 1 })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS, page: 1 }),
      sort: { col: "balanced", desc: true },
      setSort: (col) =>
        set((s) => ({
          sort: s.sort.col === col ? { col, desc: !s.sort.desc } : { col, desc: true },
          page: 1,
        })),
      page: 1,
      pageSize: 50,
      setPage: (p) => set({ page: Math.max(1, p) }),
      setPageSize: (s) => set({ pageSize: s, page: 1 }),
    }),
    {
      name: "zcl-filters",
      version: 1,
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: (s) => ({ filters: s.filters, sort: s.sort, pageSize: s.pageSize }),
    },
  ),
);
