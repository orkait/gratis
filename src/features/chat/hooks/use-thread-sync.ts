"use client";
import { useEffect, useRef } from "react";
import type { ChatStatus, UIMessage } from "ai";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThread, useSaveThread } from "../api-threads";
import { toChatMessages, toUIMessages } from "../lib/messages";

type ThreadSyncArgs = {
  modelId: string;
  messages: UIMessage[];
  status: ChatStatus;
  setMessages: (messages: UIMessage[]) => void;
};

/** Keeps IndexedDB and the live chat in step, in both directions.
 *
 * Reading: the selected thread's messages are seeded into the chat when it changes.
 * Writing: a turn is persisted exactly once, on the streaming -> ready edge.
 *
 * The two share `loadedIdRef` on purpose. A brand-new chat has no thread id until its first turn is
 * saved; without recording the id we just created, the read side would see a "new" thread id arrive
 * and re-seed the chat from the database, wiping the messages that are already on screen.
 */
export function useThreadSync({ modelId, messages, status, setMessages }: ThreadSyncArgs): void {
  const currentThreadId = useChatSessionStore((state) => state.currentThreadId);
  const setCurrentThreadId = useChatSessionStore((state) => state.setCurrentThreadId);
  const { data: thread, isSuccess: threadLoaded } = useThread(currentThreadId);
  const saveThread = useSaveThread();

  const loadedIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Ghost pointer: currentThreadId references a thread no longer in idb -> fall back to a fresh chat.
    if (currentThreadId && threadLoaded && thread === null) {
      loadedIdRef.current = null;
      setMessages([]);
      setCurrentThreadId(null);
      return;
    }
    if (currentThreadId && thread && loadedIdRef.current !== thread.id) {
      loadedIdRef.current = thread.id;
      setMessages(toUIMessages(thread.messages));
      return;
    }
    if (!currentThreadId && loadedIdRef.current !== null) {
      loadedIdRef.current = null;
      setMessages([]);
    }
  }, [currentThreadId, thread, threadLoaded, setMessages, setCurrentThreadId]);

  const previousStatus = useRef<ChatStatus>(status);
  useEffect(() => {
    const was = previousStatus.current;
    previousStatus.current = status;
    if (was !== "streaming" || status !== "ready" || messages.length === 0) return;

    const persisted = toChatMessages(messages);
    if (persisted.length === 0) return;

    void saveThread
      .mutateAsync({ id: currentThreadId, modelId, messages: persisted })
      .then((threadId) => {
        if (currentThreadId) return;
        loadedIdRef.current = threadId;
        setCurrentThreadId(threadId);
      });
  }, [status, messages, currentThreadId, modelId, saveThread, setCurrentThreadId]);
}
