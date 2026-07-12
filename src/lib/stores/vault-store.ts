import { create } from "zustand";
import { encryptSecrets, decryptSecrets, type Secrets } from "@/lib/vault";
import { saveVault, loadVault, clearVault } from "@/lib/vault-db";

/** Unlocked keys live here, in memory, for the life of the tab.
 *
 * Deliberately NOT wrapped in zustand's persist middleware. Persisting this store would write the
 * decrypted keys straight back to localStorage in plaintext and defeat the entire vault.
 */

export type VaultStatus = "loading" | "empty" | "locked" | "unlocked";

type VaultState = {
  status: VaultStatus;
  secrets: Secrets;
  init: () => Promise<void>;
  unlock: (passphrase: string) => Promise<void>;
  lock: () => void;
  save: (secrets: Secrets, passphrase: string) => Promise<void>;
  destroy: () => Promise<void>;
  keyFor: (provider: string) => string | undefined;
};

export const useVaultStore = create<VaultState>((set, get) => ({
  status: "loading",
  secrets: {},

  init: async () => {
    const blob = await loadVault();
    set({ status: blob ? "locked" : "empty" });
  },

  unlock: async (passphrase) => {
    const blob = await loadVault();
    if (!blob) {
      set({ status: "empty" });
      return;
    }
    // Throws on a wrong passphrase - AES-GCM authenticates. Let it propagate to the UI.
    const secrets = await decryptSecrets(blob, passphrase);
    set({ status: "unlocked", secrets });
  },

  lock: () => set({ status: "locked", secrets: {} }),

  save: async (secrets, passphrase) => {
    await saveVault(await encryptSecrets(secrets, passphrase));
    set({ status: "unlocked", secrets });
  },

  destroy: async () => {
    await clearVault();
    set({ status: "empty", secrets: {} });
  },

  keyFor: (provider) => get().secrets[provider] || undefined,
}));
