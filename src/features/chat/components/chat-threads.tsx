"use client";
import { memo, useCallback } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { cn } from "@/lib/utils";
import { useThreadList } from "../hooks/use-thread-list";
import { THREAD_SEARCH_PLACEHOLDER } from "../lib/chat-config";
import type { ChatThread } from "../lib/chat-db";
import { providerNameForModel, type ThreadGroup } from "../lib/threads";

/** The chat's sidebar PANEL: conversations only.
 *
 * It used to be a whole <aside> with its own logo, its own nav and its own footer links - a second
 * application's chrome living next to the market's. The shell owns all of that now; this renders
 * inside it. */

type OpenThread = (threadId: string, modelId: string) => void;
type DeleteThread = (threadId: string) => void;

export function ChatThreads() {
  const {
    query,
    groups,
    isEmpty,
    isSearching,
    currentThreadId,
    handleSearchChange,
    handleNewChat,
    handleOpen,
    handleDelete,
  } = useThreadList();

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <Button onClick={handleNewChat} className="w-full justify-start">
          <Plus className="w-3.5 h-3.5" /> New chat
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
          <Input
            value={query}
            onChange={handleSearchChange}
            placeholder={THREAD_SEARCH_PLACEHOLDER}
            className="pl-8"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-2 space-y-3">
        {groups.map((group) => (
          <ThreadSection
            key={group.bucket}
            group={group}
            currentThreadId={currentThreadId}
            onOpen={handleOpen}
            onDelete={handleDelete}
          />
        ))}
        {isEmpty && <EmptyThreads isSearching={isSearching} />}
      </div>
    </div>
  );
}

function ThreadSection({
  group,
  currentThreadId,
  onOpen,
  onDelete,
}: {
  group: ThreadGroup;
  currentThreadId: string | null;
  onOpen: OpenThread;
  onDelete: DeleteThread;
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider text-(--color-fg-subtle) px-2 py-1.5">
        {group.label}
      </div>
      <div className="space-y-0.5">
        {group.threads.map((thread) => (
          <ThreadRow
            key={thread.id}
            thread={thread}
            active={currentThreadId === thread.id}
            onOpen={onOpen}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

/** Memoised: a streaming reply re-renders the page many times a second, and the thread list has no
 *  reason to re-render with it. */
const ThreadRow = memo(function ThreadRow({
  thread,
  active,
  onOpen,
  onDelete,
}: {
  thread: ChatThread;
  active: boolean;
  onOpen: OpenThread;
  onDelete: DeleteThread;
}) {
  const handleOpen = useCallback(
    () => onOpen(thread.id, thread.modelId),
    [onOpen, thread.id, thread.modelId],
  );
  const handleDelete = useCallback(() => onDelete(thread.id), [onDelete, thread.id]);

  return (
    <div
      className={cn(
        "group w-full rounded-md flex items-center transition-colors duration-[120ms]",
        active
          ? "bg-(--color-accent-soft) text-(--color-fg)"
          : "text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg)",
      )}
    >
      <button
        type="button"
        onClick={handleOpen}
        className="flex-1 min-w-0 px-2 h-9 flex items-center gap-2 text-left cursor-pointer"
      >
        <ProviderAvatar provider={providerNameForModel(thread.modelId)} size="xs" />
        <span className="flex-1 truncate text-sm">{thread.title}</span>
      </button>
      <button
        type="button"
        onClick={handleDelete}
        aria-label="Delete chat"
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] text-(--color-fg-subtle) hover:text-(--color-danger) cursor-pointer h-9 pl-1 pr-2 flex items-center"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
});

function EmptyThreads({ isSearching }: { isSearching: boolean }) {
  return (
    <div className="px-3 py-6 text-center text-sm text-(--color-fg-subtle)">
      {isSearching ? "No matches" : "No chats yet. Click New chat above."}
    </div>
  );
}
