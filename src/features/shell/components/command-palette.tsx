"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Eye, Filter, History, Archive } from "lucide-react";
import { ROUTES } from "@/config/routes";
import { useUIStore } from "@/stores/ui-store";
import { useFiltersStore } from "@/stores/filters-store";
import { useChatSessionStore } from "@/stores/chat-session-store";
import { listThreads, type ChatThread } from "@/features/chat/lib/chat-db";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, commandClasses } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import type { ModelStats } from "@/types/model";

const RECENT_LIMIT = 8;
const MODEL_LIMIT = 30;
const CHAT_WITH_LIMIT = 10;

type ItemClass = ReturnType<typeof commandClasses>["item"];

export function CommandPalette({ models }: { models: ModelStats[] }) {
  const { cmdkOpen, setCmdk, openDrawer, closeDrawer } = useUIStore();
  const { setFilter, resetFilters } = useFiltersStore();
  const { openThread, startNewChat } = useChatSessionStore();
  const router = useRouter();
  const cls = commandClasses();
  const [recent, setRecent] = useState<ChatThread[]>([]);

  useEffect(() => {
    if (!cmdkOpen) return;
    let cancelled = false;
    void listThreads().then((all) => {
      if (!cancelled) setRecent(all.slice(0, RECENT_LIMIT));
    });
    return () => {
      cancelled = true;
    };
  }, [cmdkOpen]);

  const handleResetFilters = useCallback(() => {
    resetFilters();
    setCmdk(false);
  }, [resetFilters, setCmdk]);

  const handleFreeOnly = useCallback(() => {
    setFilter("freeOnly", true);
    setCmdk(false);
  }, [setFilter, setCmdk]);

  const handleOpenArchive = useCallback(() => {
    setCmdk(false);
    router.push(ROUTES.archive);
  }, [setCmdk, router]);

  const handleResumeThread = useCallback(
    (thread: ChatThread) => {
      closeDrawer();
      openThread(thread.id, thread.modelId);
      setCmdk(false);
    },
    [closeDrawer, openThread, setCmdk],
  );

  const handleInspectModel = useCallback(
    (model: ModelStats) => {
      openDrawer(model.id);
      setCmdk(false);
    },
    [openDrawer, setCmdk],
  );

  const handleChatWithModel = useCallback(
    (model: ModelStats) => {
      closeDrawer();
      startNewChat(model.id);
      setCmdk(false);
      router.push(ROUTES.chat);
    },
    [closeDrawer, startNewChat, setCmdk, router],
  );

  return (
    <Dialog open={cmdkOpen} onOpenChange={setCmdk}>
      <DialogContent className="p-0 max-w-[640px] !z-(--z-command) [&~[data-slot='dialog-backdrop']]:!z-(--z-command-backdrop)">
        <Command className={cls.root} loop>
          <CommandInput placeholder="Search models, providers, actions..." className={cls.input} />
          <CommandList className={cls.list}>
            <CommandEmpty className={cls.empty}>No matches.</CommandEmpty>

            <CommandGroup heading="Actions" className={cls.group}>
              <CommandItem className={cls.item} onSelect={handleResetFilters}>
                <Filter className="w-3.5 h-3.5" /> Reset all filters
              </CommandItem>
              <CommandItem className={cls.item} onSelect={handleFreeOnly}>
                <Filter className="w-3.5 h-3.5" /> Show free models only
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Navigation" className={cls.group}>
              <CommandItem className={cls.item} value="archive" onSelect={handleOpenArchive}>
                <Archive className="w-3.5 h-3.5" />
                <span className="flex-1">Open chat archive</span>
              </CommandItem>
            </CommandGroup>

            {recent.length > 0 && (
              <CommandGroup heading="Recent chats" className={cls.group}>
                {recent.map((thread) => (
                  <RecentChatItem
                    key={thread.id}
                    thread={thread}
                    itemClass={cls.item}
                    onSelect={handleResumeThread}
                  />
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Models" className={cls.group}>
              {models.slice(0, MODEL_LIMIT).map((model) => (
                <ModelItem
                  key={model.id}
                  model={model}
                  itemClass={cls.item}
                  onSelect={handleInspectModel}
                />
              ))}
            </CommandGroup>

            <CommandGroup heading="Chat with..." className={cls.group}>
              {models.slice(0, CHAT_WITH_LIMIT).map((model) => (
                <ChatWithItem
                  key={`chat-${model.id}`}
                  model={model}
                  itemClass={cls.item}
                  onSelect={handleChatWithModel}
                />
              ))}
            </CommandGroup>
          </CommandList>
          <div className="h-9 border-t border-(--color-border) px-3 flex items-center justify-end gap-3 text-[10px] text-(--color-fg-subtle)">
            <span className="flex items-center gap-1"><Kbd>{"↑"}</Kbd><Kbd>{"↓"}</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>{"↵"}</Kbd> select</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function RecentChatItem({
  thread,
  itemClass,
  onSelect,
}: {
  thread: ChatThread;
  itemClass: ItemClass;
  onSelect: (thread: ChatThread) => void;
}) {
  const handleSelect = useCallback(() => onSelect(thread), [onSelect, thread]);

  return (
    <CommandItem
      className={itemClass}
      value={`recent ${thread.title} ${thread.modelId}`}
      onSelect={handleSelect}
    >
      <History className="w-3.5 h-3.5" />
      <span className="flex-1 truncate">{thread.title}</span>
      <span className="text-[10px] font-mono text-(--color-fg-subtle) truncate max-w-[140px]">
        {thread.modelId}
      </span>
    </CommandItem>
  );
}

function ModelItem({
  model,
  itemClass,
  onSelect,
}: {
  model: ModelStats;
  itemClass: ItemClass;
  onSelect: (model: ModelStats) => void;
}) {
  const handleSelect = useCallback(() => onSelect(model), [onSelect, model]);

  return (
    <CommandItem className={itemClass} value={model.id} onSelect={handleSelect}>
      <Eye className="w-3.5 h-3.5" />
      <span className="flex-1 truncate">{model.id}</span>
      <span className="text-[10px] font-mono text-(--color-fg-subtle)">{model.provider}</span>
    </CommandItem>
  );
}

function ChatWithItem({
  model,
  itemClass,
  onSelect,
}: {
  model: ModelStats;
  itemClass: ItemClass;
  onSelect: (model: ModelStats) => void;
}) {
  const handleSelect = useCallback(() => onSelect(model), [onSelect, model]);

  return (
    <CommandItem className={itemClass} value={`chat ${model.id}`} onSelect={handleSelect}>
      <MessageSquare className="w-3.5 h-3.5" />
      <span className="flex-1 truncate">{model.id}</span>
    </CommandItem>
  );
}
