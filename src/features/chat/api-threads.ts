"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listThreads,
  getThread,
  createThread,
  updateThread,
  deleteThread,
  searchThreads,
  getStorageEstimate,
  type ChatMessage,
  type ChatThread,
} from "@/features/chat/lib/chat-db";

/** React Query over the thread store. The cache keys all hang off one root, so an invalidation of
 *  the root reaches every list, search and detail view of the same data. */
const ROOT = "threads";

export const threadsKey = [ROOT] as const;
export const threadKey = (id: string) => [ROOT, id] as const;
const threadSearchKey = (query: string) => [ROOT, "search", query] as const;
const newThreadKey = [ROOT, "new"] as const;

/** All threads, or a text search across them. */
export function useThreads(search = "") {
  const query = search.trim();
  return useQuery<ChatThread[]>({
    queryKey: query ? threadSearchKey(query) : threadsKey,
    queryFn: () => (query ? searchThreads(query) : listThreads()),
  });
}

/** A single thread by id (null = a new, unsaved chat). Missing -> null, never undefined: the caller
 *  distinguishes "not loaded yet" from "this thread is gone", and undefined blurs the two. */
export function useThread(id: string | null) {
  return useQuery<ChatThread | null>({
    queryKey: id ? threadKey(id) : newThreadKey,
    queryFn: async () => (id ? ((await getThread(id)) ?? null) : null),
    enabled: id !== null,
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteThread(id),
    onSuccess: () => {
      // Invalidate the whole thread namespace, not just the unfiltered list: deleting while a
      // search is active must refresh the SEARCH results too, and those live under a different key.
      void queryClient.invalidateQueries({ queryKey: [ROOT] });
    },
  });
}

export type SaveThreadInput = {
  id: string | null;
  modelId: string;
  messages: ChatMessage[];
  tokenUsage?: number | null;
};

/** Create-or-update a thread's messages. Returns the (possibly new) thread id. */
export function useSaveThread() {
  const queryClient = useQueryClient();
  return useMutation<string, Error, SaveThreadInput>({
    mutationFn: async ({ id, modelId, messages, tokenUsage }): Promise<string> => {
      if (id) {
        await updateThread(id, { messages, tokenUsage });
        return id;
      }
      const created = await createThread(modelId);
      await updateThread(created.id, { messages, tokenUsage });
      return created.id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: threadsKey });
      void queryClient.invalidateQueries({ queryKey: threadKey(id) });
    },
  });
}

const storageEstimateKey = [ROOT, "storage"] as const;

/** Browser storage usage for the archive. A query, not a useEffect: it is server-ish state with a
 *  cache, and it must re-read after a delete - which invalidating [ROOT] gives us for free. */
export function useStorageEstimate() {
  return useQuery({
    queryKey: storageEstimateKey,
    queryFn: getStorageEstimate,
  });
}
