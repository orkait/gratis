/** Chat's own constants.
 *
 * Cross-feature contracts (routes, providers, headers, database names) live in src/config and are
 * imported from there. What is left here is chat-local: copy, limits and the two class strings that
 * two different components must agree on.
 */

/** Prompt starters offered on an empty conversation. */
export const PROMPT_SUGGESTIONS: readonly string[] = [
  "Write a Python function to download a URL with retries.",
  "Explain CRDTs in 5 sentences.",
  "Plan a 3-day Tokyo itinerary, focused on food.",
  "Refactor this SQL: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);",
];

/** Model shortcuts shown before any model has been picked. */
export const EMPTY_STATE_MODEL_COUNT = 6;

/** Rows per group (free / paid) in the inline model picker. */
export const MODEL_PICKER_GROUP_LIMIT = 50;

/** The thread search box. The `/` hotkey focuses it BY placeholder, so the string and the selector
 *  must be derived from one value or the hotkey silently stops working. */
export const THREAD_SEARCH_PLACEHOLDER = "Search chats...";
export const THREAD_SEARCH_SELECTOR = `aside input[placeholder="${THREAD_SEARCH_PLACEHOLDER}"]`;

export const DELETE_THREAD_CONFIRM = "Delete this chat?";

/** Enter sends, Shift+Enter inserts a newline. */
export const SUBMIT_KEY = "Enter";

/** How long a code block's copy button stays in its "copied" state. */
export const COPY_FEEDBACK_MS = 1200;

/** Token accounting. A heuristic, not a tokenizer: good enough for a budget meter and a sliding
 *  window, and labelled "~" wherever it is shown. */
export const TOKENS = {
  /** Rough chars-per-token across the models we route to. */
  charsPerToken: 4,
  /** Fraction of the context window history may fill; the rest is headroom for the reply. */
  historyBudget: 0.7,
} as const;

/** Context-meter thresholds, as a percentage of the window consumed. */
export const CONTEXT_THRESHOLDS = { warning: 70, danger: 90 } as const;

/** The vault secret that holds the Cloudflare account id. Keyed by provider id everywhere else, but
 *  Cloudflare needs a second credential, so it gets its own entry (see PROVIDERS.cloudflare
 *  .needsAccountId). The API-keys form writes this exact id. */
export const VAULT_SECRET_KEYS = { cloudflareAccountId: "cloudflare_account_id" } as const;

/** The chat owns the viewport below the shell header (h-12 / 3rem), so the composer stays pinned to
 *  the bottom and only the transcript scrolls. */
export const CHAT_SURFACE_CLASS = "flex flex-col min-h-0 h-[calc(100dvh-3rem)]";

/** Reading measure for the transcript. The composer sits on the same column so the two line up. */
export const CHAT_COLUMN_CLASS = "max-w-[760px] mx-auto px-6";
