import type { StateStorage } from "zustand/middleware";

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

/** localStorage in the browser, a no-op on the server (SSR-safe for zustand persist). */
export function getBrowserStorage(): StateStorage {
  return typeof window !== "undefined" ? window.localStorage : noopStorage;
}
