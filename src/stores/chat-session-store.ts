import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { POOL_MODEL_ID } from "@/config/models";
import { STORAGE_KEYS, STORE_VERSIONS } from "@/config/storage";
import { getBrowserStorage } from "./storage";

const FALLBACK_MODEL = POOL_MODEL_ID;

/** Which conversation the chat view is pointed at. Thread *data* lives in React Query / idb. */
type ChatSessionState = {
  chatModelId: string | null;
  currentThreadId: string | null;
  lastChatModelId: string | null;
  /** Open an existing thread: set id + model atomically. */
  openThread: (threadId: string, modelId: string) => void;
  /** Set thread id after lazy creation. Does NOT touch chatModelId. */
  setCurrentThreadId: (id: string | null) => void;
  /** Start a new chat: clear thread, set model. Thread is created on first message. */
  startNewChat: (modelId?: string) => void;
  /** Change model for the current empty chat. */
  setChatModel: (modelId: string) => void;
};

export const useChatSessionStore = create<ChatSessionState>()(
  persist(
    (set) => ({
      chatModelId: null,
      currentThreadId: null,
      lastChatModelId: null,
      openThread: (threadId, modelId) =>
        set({ currentThreadId: threadId, chatModelId: modelId, lastChatModelId: modelId }),
      setCurrentThreadId: (id) => set({ currentThreadId: id }),
      startNewChat: (modelId) =>
        set((s) => {
          const m = modelId ?? s.chatModelId ?? s.lastChatModelId ?? FALLBACK_MODEL;
          return { currentThreadId: null, chatModelId: m, lastChatModelId: m };
        }),
      setChatModel: (modelId) => set({ chatModelId: modelId, lastChatModelId: modelId }),
    }),
    {
      name: STORAGE_KEYS.chatSession,
      version: STORE_VERSIONS.chatSession,
      storage: createJSONStorage(() => getBrowserStorage()),
      partialize: (s) => ({
        currentThreadId: s.currentThreadId,
        chatModelId: s.chatModelId,
        lastChatModelId: s.lastChatModelId,
      }),
    },
  ),
);
