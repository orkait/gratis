import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ProviderFilter } from "./types";

export type SortCol = "balanced" | "value" | "tps" | "ctx" | "params" | "id" | "is_free" | "caps";

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

type State = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  sort: { col: SortCol; desc: boolean };
  setSort: (col: SortCol) => void;
  page: number;
  pageSize: PageSize;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;
  drawerModelId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  cmdkOpen: boolean;
  setCmdk: (v: boolean) => void;
  chatModelId: string | null;
  openChat: (id: string) => void;
  closeChat: () => void;
  currentThreadId: string | null;
  setCurrentThreadId: (id: string | null) => void;
  openThreadById: (threadId: string, modelId: string) => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
};

const DEFAULT_FILTERS: Filters = {
  freeOnly: false, openOnly: false, brain: false, tools: false,
  minParams: 0, minCtx: 0, search: "", provider: "all",
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v }, page: 1 })),
      resetFilters: () => set({ filters: DEFAULT_FILTERS, page: 1 }),
      sort: { col: "balanced", desc: true },
      setSort: (col) => set((s) => ({
        sort: s.sort.col === col ? { col, desc: !s.sort.desc } : { col, desc: true },
        page: 1,
      })),
      page: 1,
      pageSize: 50,
      setPage: (p) => set({ page: Math.max(1, p) }),
      setPageSize: (s) => set({ pageSize: s, page: 1 }),
      drawerModelId: null,
      openDrawer: (id) => set({ drawerModelId: id }),
      closeDrawer: () => set({ drawerModelId: null }),
      cmdkOpen: false,
      setCmdk: (v) => set({ cmdkOpen: v }),
      chatModelId: null,
      openChat: (id) => set({ chatModelId: id }),
      closeChat: () => set({ chatModelId: null, currentThreadId: null }),
      currentThreadId: null,
      setCurrentThreadId: (id) => set({ currentThreadId: id }),
      openThreadById: (threadId, modelId) => set({ currentThreadId: threadId, chatModelId: modelId }),
      theme: "dark",
      toggleTheme: () => set((s) => {
        const next = s.theme === "dark" ? "light" : "dark";
        if (typeof document !== "undefined") {
          document.documentElement.dataset.theme = next === "light" ? "light" : "";
        }
        return { theme: next };
      }),
      sidebarWidth: 240,
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(200, Math.min(400, w)) }),
    }),
    {
      name: "zerocostllm-store",
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") return localStorage;
        const noop: Storage = {
          length: 0,
          clear: () => {},
          getItem: () => null,
          key: () => null,
          removeItem: () => {},
          setItem: () => {},
        };
        return noop;
      }),
      partialize: (s) => ({
        filters: s.filters,
        sort: s.sort,
        pageSize: s.pageSize,
        theme: s.theme,
        sidebarWidth: s.sidebarWidth,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "light" && typeof document !== "undefined") {
          document.documentElement.dataset.theme = "light";
        }
      },
    },
  ),
);
