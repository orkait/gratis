/** The backend contract. Header names are a wire protocol shared with the FastAPI service - a typo
 *  here is a silent auth failure, so they are declared once. */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Per-request bring-your-own-key headers. The backend reads exactly these names. */
export const AUTH_HEADERS = {
  providerKey: "X-Provider-Key",
  cloudflareAccountId: "X-CF-Account-Id",
} as const;

export const BACKEND_ENDPOINTS = {
  rankings: "/v1/rankings",
  chatCompletions: "/v1/chat/completions",
  models: "/v1/models",
} as const;

/** The backend TTL-caches the assembled market for 30 min; mirror it so remounts do not refetch. */
export const RANKINGS_STALE_MS = Number(process.env.NEXT_PUBLIC_RANKINGS_STALE_MS ?? 30 * 60 * 1000);
