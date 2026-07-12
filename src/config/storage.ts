/** Every persistence key in the browser. Renaming one of these orphans user data, so they live
 * together where that consequence is visible. */

export const STORAGE_KEYS = {
  ui: "zcl-ui",
  filters: "zcl-filters",
  chatSession: "zcl-chat-session",
} as const;

export const DATABASES = {
  /** Chat history. Predates the Gratis rename and must NEVER be renamed with the product: a new
   *  name points the app at an empty database and orphans every existing conversation. */
  chat: { name: "zerocostllm-chat", version: 1, store: "threads" },
  /** Encrypted API keys. Separate database from chat on purpose: wiping your keys must not wipe
   *  your conversations. Holds ciphertext only. */
  vault: { name: "gratis-vault", version: 1, store: "vault", recordKey: "secrets" },
} as const;

/** Store-version bumps force a `migrate` in the zustand slice. */
export const STORE_VERSIONS = {
  ui: 3,
  filters: 2,
  chatSession: 1,
} as const;
