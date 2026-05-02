import { create } from "zustand";
import type { ProviderFilter } from "./types";

export type SortCol = "balanced" | "value" | "tps" | "ctx" | "params" | "id";

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

type State = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  sort: { col: SortCol; desc: boolean };
  setSort: (col: SortCol) => void;
  drawerModelId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  cmdkOpen: boolean;
  setCmdk: (v: boolean) => void;
  chatModelId: string | null;
  openChat: (id: string) => void;
  closeChat: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
};

const DEFAULT_FILTERS: Filters = {
  freeOnly: false, openOnly: false, brain: false, tools: false,
  minParams: 0, minCtx: 0, search: "", provider: "all",
};

export const useStore = create<State>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  sort: { col: "balanced", desc: true },
  setSort: (col) => set((s) => ({
    sort: s.sort.col === col ? { col, desc: !s.sort.desc } : { col, desc: true }
  })),
  drawerModelId: null,
  openDrawer: (id) => set({ drawerModelId: id }),
  closeDrawer: () => set({ drawerModelId: null }),
  cmdkOpen: false,
  setCmdk: (v) => set({ cmdkOpen: v }),
  chatModelId: null,
  openChat: (id) => set({ chatModelId: id }),
  closeChat: () => set({ chatModelId: null }),
  theme: "dark",
  toggleTheme: () => set((s) => {
    const next = s.theme === "dark" ? "light" : "dark";
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = next === "light" ? "light" : "";
    }
    return { theme: next };
  }),
}));
