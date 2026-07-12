"use client";
import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { ROUTES } from "@/config/routes";

/** "Open this model in chat". Returns a STABLE callback: the market's rows are memoized, and an
 * unstable handler would defeat that memo and re-render all 50 rows on every drawer open. */
export function useOpenChat(): (modelId: string) => void {
  const startNewChat = useChatSessionStore((s) => s.startNewChat);
  const router = useRouter();

  return useCallback(
    (modelId: string) => {
      startNewChat(modelId);
      router.push(ROUTES.chat);
    },
    [startNewChat, router],
  );
}
