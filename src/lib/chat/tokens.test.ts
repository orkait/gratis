import { describe, it, expect } from "vitest";
import type { UIMessage } from "ai";
import { estimateTokens, trimToContext } from "./tokens";

const msg = (text: string, role: "user" | "assistant" = "user"): UIMessage => ({
  id: Math.random().toString(36),
  role,
  parts: [{ type: "text", text }],
});

describe("estimateTokens", () => {
  it("approximates ~4 chars per token across messages", () => {
    expect(estimateTokens([msg("12345678")])).toBe(2); // 8 chars / 4
    expect(estimateTokens([msg("1234"), msg("1234")])).toBe(2); // 1 + 1
  });

  it("is zero for an empty conversation", () => {
    expect(estimateTokens([])).toBe(0);
  });
});

describe("trimToContext", () => {
  it("keeps everything when it fits the budget", () => {
    const ms = [msg("a"), msg("b"), msg("c")];
    expect(trimToContext(ms, 1000)).toHaveLength(3);
  });

  it("drops the oldest messages when over budget, keeping recent ones", () => {
    // each message ~25 tokens (100 chars). budget = 200 * 0.7 = 140 -> ~5 fit.
    const ms = Array.from({ length: 10 }, (_, i) => msg("x".repeat(100), i % 2 ? "assistant" : "user"));
    const kept = trimToContext(ms, 200);
    expect(kept.length).toBeLessThan(10);
    expect(kept.length).toBeGreaterThan(0);
    // keeps the MOST RECENT ones
    expect(kept[kept.length - 1]).toBe(ms[ms.length - 1]);
  });

  it("always keeps at least the last message even if it alone exceeds budget", () => {
    const ms = [msg("short"), msg("x".repeat(10_000))];
    const kept = trimToContext(ms, 10);
    expect(kept.length).toBeGreaterThanOrEqual(1);
    expect(kept[kept.length - 1]).toBe(ms[ms.length - 1]);
  });

  it("returns messages unchanged when context is unknown (0)", () => {
    const ms = [msg("a"), msg("b")];
    expect(trimToContext(ms, 0)).toEqual(ms);
  });
});
