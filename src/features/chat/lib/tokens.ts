import type { UIMessage } from "ai";
import { TOKENS } from "./chat-config";
import { messageText } from "./messages";

/** Rough heuristic - good enough for a context-budget meter and a sliding window.
 *  Not exact tokenization (that varies per model); labelled "~" in the UI. */

function tokensOf(message: UIMessage): number {
  return Math.ceil(messageText(message).length / TOKENS.charsPerToken);
}

/** Estimated prompt tokens for the whole conversation. */
export function estimateTokens(messages: UIMessage[]): number {
  return messages.reduce((sum, message) => sum + tokensOf(message), 0);
}

/**
 * Keep the most recent messages that fit within TOKENS.historyBudget * contextTokens.
 * Always keeps at least the last message. Older turns are dropped (sliding window).
 */
export function trimToContext(messages: UIMessage[], contextTokens: number): UIMessage[] {
  if (contextTokens <= 0 || messages.length <= 1) return messages;
  const budget = Math.floor(contextTokens * TOKENS.historyBudget);
  let total = 0;
  const kept: UIMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const cost = tokensOf(messages[i]);
    if (total + cost > budget && kept.length > 0) break;
    kept.unshift(messages[i]);
    total += cost;
  }
  return kept;
}
