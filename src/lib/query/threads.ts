"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  searchThreads,
  type ChatMessage,
} from "@/lib/chat-db";

export const threadsKey = ["threads"] as const;
export const threadKey = (id: string) => ["threads", id] as const;

/** All threads, or a text search across them. */
export function useThreads(search = "") {
  const q = search.trim();
  return useQuery({
    queryKey: q ? (["threads", "search", q] as const) : threadsKey,
    queryFn: () => (q ? searchThreads(q) : listThreads()),
  });
}

/** A single thread by id (null = a new, unsaved chat). Missing -> null, never undefined. */
export function useThread(id: string | null) {
  return useQuery({
    queryKey: id ? threadKey(id) : (["threads", "new"] as const),
    queryFn: async () => (id ? ((await getThread(id)) ?? null) : null),
    enabled: id !== null,
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

type SaveInput = {
  id: string | null;
  modelId: string;
  messages: ChatMessage[];
  tokenUsage?: number | null;
};

/** Create-or-update a thread's messages. Returns the (possibly new) thread id. */
export function useSaveThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, modelId, messages, tokenUsage }: SaveInput): Promise<string> => {
      if (id) {
        await updateThread(id, { messages, tokenUsage });
        return id;
      }
      const created = await createThread(modelId);
      await updateThread(created.id, { messages, tokenUsage });
      return created.id;
    },
    onSuccess: (id) => {
      void qc.invalidateQueries({ queryKey: threadsKey });
      void qc.invalidateQueries({ queryKey: threadKey(id) });
    },
  });
}
