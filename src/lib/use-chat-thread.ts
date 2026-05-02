"use client";
import { useEffect, useRef, useState } from "react";
import { createThread, getThread, updateThread, type ChatMessage, type ChatThread } from "./chat-db";

const SAVE_DEBOUNCE_MS = 400;

type State = {
  thread: ChatThread | null;
  loading: boolean;
};

type Patch = { messages?: ChatMessage[]; tokenUsage?: number | null };

export function useChatThread(modelId: string, threadId: string | null, onThreadCreated: (id: string) => void) {
  const [state, setState] = useState<State>({ thread: null, loading: !!threadId });
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPatch = useRef<Patch | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const creatingRef = useRef<Promise<ChatThread> | null>(null);

  const flushNow = async () => {
    const id = currentIdRef.current;
    const patch = pendingPatch.current;
    if (!id || !patch) return;
    pendingPatch.current = null;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    try {
      const next = await updateThread(id, patch);
      if (next) setState((s) => ({ ...s, thread: next }));
    } catch (err) {
      console.error("chat-thread save error", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    currentIdRef.current = null;
    creatingRef.current = null;

    if (!threadId) {
      setState({ thread: null, loading: false });
      return () => {
        cancelled = true;
        void flushNow();
      };
    }

    setState({ thread: null, loading: true });
    (async () => {
      try {
        const t = await getThread(threadId);
        if (cancelled) return;
        if (t && t.modelId === modelId) {
          currentIdRef.current = t.id;
          setState({ thread: t, loading: false });
        } else {
          setState({ thread: null, loading: false });
        }
      } catch (err) {
        console.error("chat-thread load error", err);
        if (!cancelled) setState({ thread: null, loading: false });
      }
    })();

    return () => {
      cancelled = true;
      void flushNow();
    };
  }, [modelId, threadId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const id = currentIdRef.current;
      const patch = pendingPatch.current;
      if (!id || !patch) return;
      void updateThread(id, patch);
      pendingPatch.current = null;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const ensureThread = async (): Promise<ChatThread> => {
    if (currentIdRef.current && state.thread) return state.thread;
    if (creatingRef.current) return creatingRef.current;
    const p = createThread(modelId).then((t) => {
      currentIdRef.current = t.id;
      setState({ thread: t, loading: false });
      onThreadCreated(t.id);
      return t;
    });
    creatingRef.current = p;
    try {
      return await p;
    } finally {
      creatingRef.current = null;
    }
  };

  const queueSave = (patch: Patch) => {
    pendingPatch.current = { ...pendingPatch.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { void flushNow(); }, SAVE_DEBOUNCE_MS);
  };

  const setMessages = async (messages: ChatMessage[]) => {
    await ensureThread();
    setState((s) => (s.thread ? { thread: { ...s.thread, messages }, loading: false } : s));
    queueSave({ messages });
  };

  const setTokenUsage = (tokens: number | null) => {
    if (!currentIdRef.current) return;
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
