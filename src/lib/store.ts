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

const DEFAULT_FILTERS: Filters = {
  freeOnly: false, openOnly: false, brain: false, tools: false,
  minParams: 0, minCtx: 0, search: "", provider: "all",
};

const FALLBACK_MODEL = "zero-cost-intelligent";

type State = {
  // model market
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  sort: { col: SortCol; desc: boolean };
  setSort: (col: SortCol) => void;
  page: number;
  pageSize: PageSize;
  setPage: (p: number) => void;
  setPageSize: (s: PageSize) => void;

  // overlays
  drawerModelId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  cmdkOpen: boolean;
  setCmdk: (v: boolean) => void;

  // chat
  chatModelId: string | null;
  currentThreadId: string | null;
  lastChatModelId: string | null;
  /** Open existing thread - sets both id + model atomically. */
  openThread: (threadId: string, modelId: string) => void;
  /** Internal: set thread id after lazy creation. Does NOT touch chatModelId. */
  setCurrentThreadId: (id: string | null) => void;
  /** Start new chat: clear currentThreadId, set model. Empty thread is NOT created until first message. */
  startNewChat: (modelId?: string) => void;
  /** Change model for current empty chat. If thread has messages, this is a no-op. Caller should startNewChat instead. */
  setChatModel: (modelId: string) => void;

  // theme + layout
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
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
      currentThreadId: null,
      lastChatModelId: null,
      openThread: (threadId, modelId) => set({
        currentThreadId: threadId,
        chatModelId: modelId,
        lastChatModelId: modelId,
      }),
      setCurrentThreadId: (id) => set({ currentThreadId: id }),
      startNewChat: (modelId) => set((s) => {
        const m = modelId ?? s.chatModelId ?? s.lastChatModelId ?? FALLBACK_MODEL;
        return { currentThreadId: null, chatModelId: m, lastChatModelId: m };
      }),
      setChatModel: (modelId) => set({ chatModelId: modelId, lastChatModelId: modelId }),

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
      version: 2,
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
        currentThreadId: s.currentThreadId,
        chatModelId: s.chatModelId,
        lastChatModelId: s.lastChatModelId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "light" && typeof document !== "undefined") {
          document.documentElement.dataset.theme = "light";
        }
      },
    },
  ),
);
