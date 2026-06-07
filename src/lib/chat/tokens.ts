import type { UIMessage } from "ai";

// Rough heuristic - good enough for a context-budget meter and sliding window.
// Not exact tokenization (that varies per model); labelled "~" in the UI.
const CHARS_PER_TOKEN = 4;
// Fraction of the model's context window we fill with history; the rest is
// headroom for the model's reply.
const HISTORY_BUDGET = 0.7;

function messageText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function tokensOf(m: UIMessage): number {
  return Math.ceil(messageText(m).length / CHARS_PER_TOKEN);
}

/** Estimated prompt tokens for the whole conversation. */
export function estimateTokens(messages: UIMessage[]): number {
  return messages.reduce((sum, m) => sum + tokensOf(m), 0);
}

/**
 * Keep the most recent messages that fit within HISTORY_BUDGET * contextTokens.
 * Always keeps at least the last message. Older turns are dropped (sliding window).
 */
export function trimToContext(messages: UIMessage[], contextTokens: number): UIMessage[] {
  if (contextTokens <= 0 || messages.length <= 1) return messages;
  const budget = Math.floor(contextTokens * HISTORY_BUDGET);
  let total = 0;
  const kept: UIMessage[] = [];
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = tokensOf(messages[i]);
    if (total + t > budget && kept.length > 0) break;
    kept.unshift(messages[i]);
    total += t;
  }
  return kept;
}
