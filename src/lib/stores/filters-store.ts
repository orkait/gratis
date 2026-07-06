import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBrowserStorage } from "./storage";
import type { ProviderFilter } from "@/lib/types";

// Dynamic: a base field ("id" | "tps" | "ctx" | ...) OR any composite-score dimension key emitted by
// the backend (scores.*). Kept as a plain string so the table columns are data-driven — a new scoring
// dimension shows up and sorts with zero frontend changes.
export type SortCol = string;

export type PageSize = 50 | 100 | 200;

// Decision lens — "what are you building?" — drives the primary sort + the headline score per row.
export type Lens = "overall" | "code" | "agent" | "reasoning" | "budget" | "fast";
export const LENS_METRIC: Record<Lens, string> = {
  overall: "overall", code: "fit_code", agent: "fit_agent",
  reasoning: "reasoning", budget: "fit_budget", fast: "fit_fast",
};
export type ViewMode = "decision" | "detailed";

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
  setSortRaw: (s: { col: SortCol; desc: boolean }) => void;
  lens: Lens;
  setLens: (l: Lens) => void;
  view: ViewMode;
  setView: (v: ViewMode) => void;
  page: number;
  pageSize: PageSize;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set, get) => ({
      filters: DEFAULT_FILTERS,
      setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v }, page: 1 })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS, page: 1 }),
      sort: { col: "overall", desc: true },
      setSort: (col) =>
        set((s) => ({
          sort: s.sort.col === col ? { col, desc: !s.sort.desc } : { col, desc: true },
          page: 1,
        })),
      // Guarded: skip the set entirely when nothing changes, so a no-op (e.g. an auto-reset asking for
      // page 1 when already on page 1) does NOT notify subscribers and cannot feed a re-render loop.
      setSortRaw: (x) => { const c = get().sort; if (c.col !== x.col || c.desc !== x.desc) set({ sort: x, page: 1 }); },
      lens: "overall",
      setLens: (l) => set({ lens: l, sort: { col: LENS_METRIC[l], desc: true }, page: 1 }),
      view: "decision",
      setView: (v) => { if (get().view !== v) set({ view: v }); },
      page: 1,
      pageSize: 50,
      setPage: (p) => { const np = Math.max(1, p); if (np !== get().page) set({ page: np }); },
      setPageSize: (s) => { if (s !== get().pageSize) set({ pageSize: s, page: 1 }); },
    }),
    {
      name: "zcl-filters",
      version: 1,
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: (s) => ({ filters: s.filters, sort: s.sort, pageSize: s.pageSize, lens: s.lens, view: s.view }),
    },
  ),
);
