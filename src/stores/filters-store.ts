import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS, STORE_VERSIONS } from "@/config/storage";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/config/ui";
import { getBrowserStorage } from "./storage";
import type { ProviderFilter } from "@/types/model";

// Dynamic: a base field ("id" | "tps" | "ctx" | ...) OR any composite-score dimension key emitted by
// the backend (scores.*). Kept as a plain string so the table columns are data-driven — a new scoring
// dimension shows up and sorts with zero frontend changes.
export type SortCol = string;

/** Re-exported from config, NOT re-declared. This used to be a hand-written `50 | 100 | 200`, so
 *  adding a page size to the config alone would leave the store rejecting it at the type level -
 *  precisely the drift the config layer exists to prevent. */
export type { PageSize };

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

/** The page size v2 shipped as its default. Used only by the migration. */
const LEGACY_DEFAULT_PAGE_SIZE = 50;

const DEFAULT_FILTERS: Filters = {
  // Free-first, because that is the entire product. The market used to open on $50/M and $150/M
  // models in a tool whose premise is running LLMs for nothing. The toggle is right there in the
  // sidebar for anyone who wants the paid comparison.
  freeOnly: true,
  openOnly: false, brain: false, tools: false,
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
      pageSize: DEFAULT_PAGE_SIZE,
      setPage: (p) => { const np = Math.max(1, p); if (np !== get().page) set({ page: np }); },
      setPageSize: (s) => { if (s !== get().pageSize) set({ pageSize: s, page: 1 }); },
    }),
    {
      name: STORAGE_KEYS.filters,
      version: STORE_VERSIONS.filters,
      // v1 shipped freeOnly:false as a DEFAULT, not as a choice. Anyone still carrying that value
      // never asked for it, so move them to the free-first default rather than pinning them to an
      // accident. A user who deliberately turns it off simply gets it persisted again.
      migrate: (persisted, version) => {
        let state = persisted as { filters?: Filters; pageSize?: number } | undefined;
        if (!state) return state as never;

        // v1 shipped freeOnly:false as a DEFAULT, not as a choice.
        if (version < 2 && state.filters) {
          state = { ...state, filters: { ...state.filters, freeOnly: true } };
        }

        // v2's default page size was 50. Anyone still carrying exactly 50 never picked it - they
        // took the default - so move them to the new one. A deliberate 100 or 200 is left alone.
        if (version < 3 && state.pageSize === LEGACY_DEFAULT_PAGE_SIZE) {
          state = { ...state, pageSize: DEFAULT_PAGE_SIZE };
        }

        return state as never;
      },
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: (s) => ({ filters: s.filters, sort: s.sort, pageSize: s.pageSize, lens: s.lens, view: s.view }),
    },
  ),
);
