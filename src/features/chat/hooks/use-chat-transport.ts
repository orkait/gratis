"use client";
import { useMemo } from "react";
import { DefaultChatTransport } from "ai";
import { AUTH_HEADERS } from "@/config/api";
import { providerForModel } from "@/config/providers";
import { API_ROUTES } from "@/config/routes";
import { useVaultStore } from "@/stores/vault-store";
import { VAULT_SECRET_KEYS } from "../lib/chat-config";
import { trimToContext } from "../lib/tokens";

/** The wire between the composer and /api/chat.
 *
 * Two things are load-bearing here:
 *
 * 1. The vault is read at SEND time, not at render time. A key captured into this memo would outlive
 *    a lock() and keep travelling in headers after the user locked the vault.
 * 2. History is trimmed to the model's context window before it leaves. The full conversation stays
 *    in the UI; only what fits is sent (sliding window).
 */
export function useChatTransport(modelId: string, contextTokens: number) {
  return useMemo(
    () =>
      new DefaultChatTransport({
        api: API_ROUTES.chat,
        prepareSendMessagesRequest: ({ messages }) => {
          const { keyFor } = useVaultStore.getState();
          const providerKey = keyFor(providerForModel(modelId));
          const cloudflareAccountId = keyFor(VAULT_SECRET_KEYS.cloudflareAccountId);

          return {
            body: { messages: trimToContext(messages, contextTokens), model: modelId },
            headers: {
              ...(providerKey ? { [AUTH_HEADERS.providerKey]: providerKey } : {}),
              ...(cloudflareAccountId ? { [AUTH_HEADERS.cloudflareAccountId]: cloudflareAccountId } : {}),
            },
          };
        },
      }),
    [modelId, contextTokens],
  );
}
