"use client";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { useThreads, useDeleteThread } from "../api-threads";
import { DELETE_THREAD_CONFIRM } from "../lib/chat-config";
import { filterThreads, groupThreadsByRecency, type ThreadGroup } from "../lib/threads";

export type ThreadList = {
  query: string;
  groups: ThreadGroup[];
  /** No thread survived the current query (which may be no query at all). */
  isEmpty: boolean;
  isSearching: boolean;
  currentThreadId: string | null;
  handleSearchChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleNewChat: () => void;
  handleOpen: (threadId: string, modelId: string) => void;
  handleDelete: (threadId: string) => void;
};

/** The thread panel's state and actions. Search is client-side over the already-loaded list: the
 *  full-text search in chat-db reads every message body, which is the archive's job, not the
 *  sidebar's. */
export function useThreadList(): ThreadList {
  const currentThreadId = useChatSessionStore((state) => state.currentThreadId);
  const openThread = useChatSessionStore((state) => state.openThread);
  const startNewChat = useChatSessionStore((state) => state.startNewChat);
  const setCurrentThreadId = useChatSessionStore((state) => state.setCurrentThreadId);

  const { data: threads = [] } = useThreads();
  const deleteThread = useDeleteThread();
  const [query, setQuery] = useState("");

  const groups = useMemo(
    () => groupThreadsByRecency(filterThreads(threads, query)),
    [threads, query],
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value),
    [],
  );

  const handleNewChat = useCallback(() => startNewChat(), [startNewChat]);

  const handleOpen = useCallback(
    (threadId: string, modelId: string) => openThread(threadId, modelId),
    [openThread],
  );

  const handleDelete = useCallback(
    (threadId: string) => {
      if (!window.confirm(DELETE_THREAD_CONFIRM)) return;
      void deleteThread.mutateAsync(threadId).then(() => {
        // Deleting the open thread would otherwise leave the view pointed at a ghost.
        if (currentThreadId === threadId) setCurrentThreadId(null);
      });
    },
    [deleteThread, currentThreadId, setCurrentThreadId],
  );

  return {
    query,
    groups,
    isEmpty: groups.length === 0,
    isSearching: query.trim().length > 0,
    currentThreadId,
    handleSearchChange,
    handleNewChat,
    handleOpen,
    handleDelete,
  };
}
