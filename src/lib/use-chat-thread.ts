"use client";
import { useEffect, useRef, useState } from "react";
import { createThread, getThread, updateThread, type ChatMessage, type ChatThread } from "./chat-db";

const SAVE_DEBOUNCE_MS = 400;

type State = {
  thread: ChatThread | null;
  loading: boolean;
};

export function useChatThread(modelId: string, threadId: string | null, onThreadCreated: (id: string) => void) {
  const [state, setState] = useState<State>({ thread: null, loading: true });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<{ messages?: ChatMessage[]; tokenUsage?: number | null } | null>(null);
  const currentIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState({ thread: null, loading: true });

    (async () => {
      try {
        if (threadId) {
          const t = await getThread(threadId);
          if (cancelled) return;
          if (t && t.modelId === modelId) {
            currentIdRef.current = t.id;
            setState({ thread: t, loading: false });
            return;
          }
        }
        const t = await createThread(modelId);
        if (cancelled) return;
        currentIdRef.current = t.id;
        setState({ thread: t, loading: false });
        onThreadCreated(t.id);
      } catch (err) {
        console.error("chat-thread load error", err);
        if (!cancelled) setState({ thread: null, loading: false });
      }
    })();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [modelId, threadId, onThreadCreated]);

  const flush = async () => {
    if (!currentIdRef.current || !pendingPatch.current) return;
    const patch = pendingPatch.current;
    pendingPatch.current = null;
    try {
      const next = await updateThread(currentIdRef.current, patch);
      if (next) setState((s) => ({ ...s, thread: next }));
    } catch (err) {
      console.error("chat-thread save error", err);
    }
  };

  const queueSave = (patch: { messages?: ChatMessage[]; tokenUsage?: number | null }) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flush(); }, SAVE_DEBOUNCE_MS);
  };

  const setMessages = (messages: ChatMessage[]) => {
    setState((s) => (s.thread ? { thread: { ...s.thread, messages }, loading: false } : s));
    queueSave({ messages });
  };

  const setTokenUsage = (tokens: number | null) => {
    setState((s) => (s.thread ? { thread: { ...s.thread, tokenUsage: tokens }, loading: false } : s));
    queueSave({ tokenUsage: tokens });
  };

  return {
    thread: state.thread,
    loading: state.loading,
    setMessages,
    setTokenUsage,
  };
}
