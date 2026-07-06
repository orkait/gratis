"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, BarChart3, Archive, Search, Trash2, Zap } from "lucide-react";
import { type ChatThread } from "@/lib/chat-db";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { useThreads, useDeleteThread } from "@/lib/query/threads";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { cn } from "@/lib/utils";

function safeProvider(modelId: string): string {
  if (modelId.startsWith("ollama/")) return "Ollama";
  if (modelId.startsWith("aistudio/")) return "Google AI Studio";
  if (modelId.startsWith("groq/")) return "Groq";
  if (modelId.startsWith("cerebras/")) return "Cerebras";
  if (modelId.startsWith("cloudflare/")) return "Cloudflare Workers AI";
  return "OpenRouter";
}

function bucket(ts: number): "today" | "yesterday" | "week" | "older" {
  const day = 24 * 60 * 60 * 1000;
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= start) return "today";
  if (ts >= start - day) return "yesterday";
  if (ts >= start - 7 * day) return "week";
  return "older";
}

const BUCKET_LABEL: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Last 7 days",
  older: "Older",
};

export function ChatSidebar() {
  const { currentThreadId, openThread, startNewChat, setCurrentThreadId } = useChatSessionStore();
  const { data: threads = [] } = useThreads();
  const deleteThread = useDeleteThread();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return threads;
    const q = query.toLowerCase();
    return threads.filter((t) =>
      t.title.toLowerCase().includes(q) ||
      t.modelId.toLowerCase().includes(q),
    );
  }, [threads, query]);

  const grouped = useMemo(() => {
    const map: Record<string, ChatThread[]> = { today: [], yesterday: [], week: [], older: [] };
    for (const t of filtered) map[bucket(t.updatedAt)].push(t);
    return map;
  }, [filtered]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm("Delete this chat?")) return;
    await deleteThread.mutateAsync(id);
    if (currentThreadId === id) setCurrentThreadId(null);
  };

  return (
    <aside className="w-[260px] shrink-0 h-dvh sticky top-0 bg-(--color-bg) border-r border-(--color-border) flex flex-col">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-(--color-border)">
        <div className="w-6 h-6 rounded-md bg-(--color-accent) flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-(--color-accent-fg)" strokeWidth={2.5} />
        </div>
        <span className="serif text-[16px] font-semibold">ZeroCostLLM</span>
      </div>

      <div className="p-3 space-y-2">
        <Button onClick={() => startNewChat()} className="w-full justify-start">
          <Plus className="w-3.5 h-3.5" /> New chat
        </Button>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search chats..." className="pl-8" />
        </div>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-2 space-y-3">
        {(["today", "yesterday", "week", "older"] as const).map((key) => {
          const list = grouped[key];
          if (list.length === 0) return null;
          return (
            <div key={key}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle) px-2 py-1.5">
                {BUCKET_LABEL[key]}
              </div>
              <div className="space-y-0.5">
                {list.map((t) => {
                  const active = currentThreadId === t.id;
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        "group w-full rounded-md flex items-center transition-colors duration-[120ms]",
                        active ? "bg-(--color-accent-soft) text-(--color-fg)" : "text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg)",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => openThread(t.id, t.modelId)}
                        className="flex-1 min-w-0 px-2 h-9 flex items-center gap-2 text-left cursor-pointer"
                      >
                        <ProviderAvatar provider={safeProvider(t.modelId)} size="xs" />
                        <span className="flex-1 truncate text-[13px]">{t.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => void handleDelete(e, t.id)}
                        aria-label="Delete chat"
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-[120ms] text-(--color-fg-subtle) hover:text-(--color-danger) cursor-pointer h-9 pl-1 pr-2 flex items-center"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-[12px] text-(--color-fg-subtle)">
            {query ? "No matches" : "No chats yet. Click New chat above."}
          </div>
        )}
      </div>

      <Separator />
      <div className="p-3 space-y-1">
        <Link href="/models" className="h-8 px-3 rounded-md flex items-center gap-2 text-[13px] text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg) transition-colors duration-[120ms] cursor-pointer">
          <BarChart3 className="w-3.5 h-3.5" /> Model market
        </Link>
        <Link href="/chats" className="h-8 px-3 rounded-md flex items-center gap-2 text-[13px] text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg) transition-colors duration-[120ms] cursor-pointer">
          <Archive className="w-3.5 h-3.5" /> Chat archive
        </Link>
      </div>
    </aside>
  );
}
