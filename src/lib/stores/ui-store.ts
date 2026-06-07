import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { getBrowserStorage } from "./storage";

const SIDEBAR_MIN = 200;
const SIDEBAR_MAX = 400;

/** Cross-cutting UI chrome: theme, layout, overlays. Persists only theme + sidebar width. */
type UIState = {
  theme: "dark" | "light";
  toggleTheme: () => void;
  sidebarWidth: number;
  setSidebarWidth: (w: number) => void;
  cmdkOpen: boolean;
  setCmdk: (v: boolean) => void;
  drawerModelId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: "dark",
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === "dark" ? "light" : "dark";
          if (typeof document !== "undefined") {
            document.documentElement.dataset.theme = next === "light" ? "light" : "";
          }
          return { theme: next };
        }),
      sidebarWidth: 240,
      setSidebarWidth: (w) => set({ sidebarWidth: Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, w)) }),
      cmdkOpen: false,
      setCmdk: (v) => set({ cmdkOpen: v }),
      drawerModelId: null,
      openDrawer: (id) => set({ drawerModelId: id }),
      closeDrawer: () => set({ drawerModelId: null }),
    }),
    {
      name: "zcl-ui",
      version: 1,
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: (s) => ({ theme: s.theme, sidebarWidth: s.sidebarWidth }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme === "light" && typeof document !== "undefined") {
          document.documentElement.dataset.theme = "light";
        }
      },
    },
  ),
);
