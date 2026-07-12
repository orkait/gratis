"use client";
import { useCallback, useMemo } from "react";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";
import { THREAD_SEARCH_SELECTOR } from "../lib/chat-config";

/** The keys that only mean something on the chat surface. The palette, the help sheet and Escape are
 *  the shell's (useShellOverlays) - every surface gets those for free, and duplicating them here
 *  would mean two handlers racing for the same keystroke. */
export function useChatHotkeys(): void {
  const startNewChat = useChatSessionStore((state) => state.startNewChat);

  const newChat = useCallback(() => startNewChat(), [startNewChat]);

  const focusSearch = useCallback(() => {
    document.querySelector<HTMLInputElement>(THREAD_SEARCH_SELECTOR)?.focus();
  }, []);

  const handlers = useMemo(
    () => ({
      "chat.new": newChat,
      "search.focus": focusSearch,
    }),
    [newChat, focusSearch],
  );

  useGlobalHotkeys(handlers);
}
