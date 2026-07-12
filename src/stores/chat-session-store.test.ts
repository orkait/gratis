import { describe, it, expect, beforeEach } from "vitest";
import { useChatSessionStore } from "./chat-session-store";

const reset = () =>
  useChatSessionStore.setState({ chatModelId: null, currentThreadId: null, lastChatModelId: null });

describe("chat-session-store", () => {
  beforeEach(reset);

  it("openThread sets thread + model atomically", () => {
    useChatSessionStore.getState().openThread("thr_1", "groq/llama");
    const s = useChatSessionStore.getState();
    expect(s.currentThreadId).toBe("thr_1");
    expect(s.chatModelId).toBe("groq/llama");
    expect(s.lastChatModelId).toBe("groq/llama");
  });

  it("startNewChat clears thread and keeps the current model", () => {
    useChatSessionStore.getState().openThread("thr_1", "groq/llama");
    useChatSessionStore.getState().startNewChat();
    const s = useChatSessionStore.getState();
    expect(s.currentThreadId).toBeNull();
    expect(s.chatModelId).toBe("groq/llama");
  });

  it("startNewChat falls back to lastChatModelId then the pool sentinel", () => {
    useChatSessionStore.setState({ chatModelId: null, currentThreadId: null, lastChatModelId: "cerebras/x" });
    useChatSessionStore.getState().startNewChat();
    expect(useChatSessionStore.getState().chatModelId).toBe("cerebras/x");

    reset();
    useChatSessionStore.getState().startNewChat();
    expect(useChatSessionStore.getState().chatModelId).toBe("gratis-auto");
  });

  it("setCurrentThreadId does not touch chatModelId", () => {
    useChatSessionStore.getState().openThread("thr_1", "groq/llama");
    useChatSessionStore.getState().setCurrentThreadId("thr_2");
    const s = useChatSessionStore.getState();
    expect(s.currentThreadId).toBe("thr_2");
    expect(s.chatModelId).toBe("groq/llama");
  });
});
