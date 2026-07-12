import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { STORAGE_KEYS, STORE_VERSIONS } from "@/config/storage";
import { SIDEBAR } from "@/config/ui";
import { getBrowserStorage } from "./storage";

/** Cross-cutting UI chrome: layout + overlays.
 *
 * Theme is deliberately NOT here - next-themes owns it, including the system preference, the
 * persistence and the pre-paint no-flash script.
 */
type UIState = {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  cmdkOpen: boolean;
  setCmdk: (open: boolean) => void;
  drawerModelId: string | null;
  openDrawer: (modelId: string) => void;
  closeDrawer: () => void;
};

function clampSidebar(width: number): number {
  return Math.max(SIDEBAR.minWidth, Math.min(SIDEBAR.maxWidth, width));
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarWidth: SIDEBAR.defaultWidth,
      setSidebarWidth: (width) => set({ sidebarWidth: clampSidebar(width) }),
      cmdkOpen: false,
      setCmdk: (open) => set({ cmdkOpen: open }),
      drawerModelId: null,
      openDrawer: (modelId) => set({ drawerModelId: modelId }),
      closeDrawer: () => set({ drawerModelId: null }),
    }),
    {
      name: STORAGE_KEYS.ui,
      version: STORE_VERSIONS.ui,
      storage: createJSONStorage(() => getBrowserStorage()),
      // Overlay state is ephemeral: persisting it would reopen a drawer on reload.
      partialize: (state) => ({ sidebarWidth: state.sidebarWidth }),
    },
  ),
);
