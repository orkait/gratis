/** Every route in the app. Nothing else may write a path literal. */
export const ROUTES = {
  chat: "/",
  market: "/models",
  archive: "/chats",
  settings: "/settings",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

/** Internal API routes (Next handlers), distinct from the backend's public API. */
export const API_ROUTES = {
  chat: "/api/chat",
} as const;
