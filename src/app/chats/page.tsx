"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, Trash2, Download, FileText, Database, MessageSquare } from "lucide-react";
import {
  listThreads,
  searchThreads,
  deleteThread,
  getStorageEstimate,
  type ChatThread,
} from "@/lib/chat-db";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { cn, formatNumber } from "@/lib/utils";

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson(t: ChatThread) {
  downloadFile(`${t.id}.json`, JSON.stringify(t, null, 2), "application/json");
}

function exportMarkdown(t: ChatThread) {
  const lines: string[] = [
    `# ${t.title}`,
    "",
    `- Model: \`${t.modelId}\``,
    `- Created: ${new Date(t.createdAt).toISOString()}`,
    `- Updated: ${new Date(t.updatedAt).toISOString()}`,
    "",
    "---",
    "",
  ];
  for (const m of t.messages) {
    lines.push(`## ${m.role === "user" ? "User" : "Assistant"}`);
    lines.push("");
    lines.push(m.content);
    lines.push("");
  }
  downloadFile(`${t.id}.md`, lines.join("\n"), "text/markdown");
}

function safeProviderFromModelId(modelId: string): string {
  if (modelId.startsWith("ollama/")) return "Ollama";
  if (modelId.startsWith("aistudio/")) return "Google AI Studio";
  if (modelId.startsWith("groq/")) return "Groq";
  if (modelId.startsWith("cerebras/")) return "Cerebras";
  if (modelId.startsWith("cloudflare/")) return "Cloudflare Workers AI";
  if (modelId.startsWith("openrouter/")) return "OpenRouter";
  return "OpenRouter";
}

function formatBytes(n: number): string {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export default function ChatsPage() {
  const router = useRouter();
  const { openThread } = useChatSessionStore();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [estimate, setEstimate] = useState<{ usage: number; quota: number } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = query.trim() ? await searchThreads(query) : await listThreads();
      setThreads(list);
      setEstimate(await getStorageEstimate());
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { void refresh(); }, [refresh]);

  const stats = useMemo(() => {
    const total = threads.length;
    const totalMessages = threads.reduce((s, t) => s + t.messages.length, 0);
    return { total, totalMessages };
  }, [threads]);

  const onDelete = async (id: string) => {
    await deleteThread(id);
    setPendingDeleteId(null);
    void refresh();
  };

  const onDeleteAll = async () => {
    for (const t of threads) await deleteThread(t.id);
    setBulkConfirm(false);
    void refresh();
  };

  const resume = (t: ChatThread) => {
    openThread(t.id, t.modelId);
    router.push("/");
  };

  return (
    <div className="min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <header className="h-12 sticky top-0 z-[1020] bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-4">
        <Link href="/" aria-label="Back" className="inline-flex items-center justify-center w-8 h-8 rounded-md hover:bg-(--color-surface-1) cursor-pointer text-(--color-fg-muted) hover:text-(--color-fg)">
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
        <h1 className="text-[14px] font-semibold tracking-tight flex items-baseline gap-2">
          Chat archive
          <span className="text-[11px] font-mono text-(--color-fg-subtle)">{stats.total} threads · {stats.totalMessages} messages</span>
        </h1>
        <div className="flex-1" />
        {estimate && (
          <div className="hidden sm:flex items-center gap-1.5 h-7 px-2 rounded-md bg-(--color-surface-1) border border-(--color-border) text-[10px] font-mono text-(--color-fg-muted)">
            <Database className="w-3 h-3" />
            {formatBytes(estimate.usage)} / {formatBytes(estimate.quota)}
          </div>
        )}
      </header>

      <main className="max-w-[1100px] mx-auto p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search threads, messages, models..." className="pl-8 h-9" />
          </div>
          <Button variant="outline" onClick={() => setBulkConfirm(true)} disabled={threads.length === 0}>
            <Trash2 className="w-3.5 h-3.5" /> Delete all
          </Button>
        </div>

        {loading ? (
          <div className="text-[13px] text-(--color-fg-subtle) py-8 text-center">Loading...</div>
        ) : threads.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-(--color-fg-subtle)">
            <MessageSquare className="w-8 h-8" />
            <div className="text-[14px] font-medium text-(--color-fg-muted)">{query ? "No matches" : "No saved chats yet"}</div>
            <div className="text-[12px]">{query ? "Try a different search" : "Open a model and start a conversation"}</div>
          </div>
        ) : (
          <div className="rounded-lg border border-(--color-border) bg-(--color-surface-1) divide-y divide-(--color-border)/60">
            {threads.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                pendingDelete={pendingDeleteId === t.id}
                onResume={() => resume(t)}
                onAskDelete={() => setPendingDeleteId(t.id)}
                onCancelDelete={() => setPendingDeleteId(null)}
                onConfirmDelete={() => void onDelete(t.id)}
              />
            ))}
          </div>
        )}

        {bulkConfirm && (
          <div className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <div className="rounded-lg bg-(--color-surface-1) border border-(--color-border) p-5 max-w-[400px] w-full">
              <h2 className="text-[15px] font-semibold mb-1">Delete all threads?</h2>
              <p className="text-[13px] text-(--color-fg-muted) mb-4">{stats.total} threads will be permanently removed. This cannot be undone.</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setBulkConfirm(false)}>Cancel</Button>
                <Button variant="destructive" onClick={() => void onDeleteAll()}>Delete all</Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ThreadRow({
  thread,
  pendingDelete,
  onResume,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  thread: ChatThread;
  pendingDelete: boolean;
  onResume: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  const provider = safeProviderFromModelId(thread.modelId);
  return (
    <div className={cn("flex items-center gap-3 p-3 hover:bg-(--color-surface-2)/40 transition-colors duration-[120ms]", pendingDelete && "bg-(--color-danger-soft)")}>
      <ProviderAvatar provider={provider} size="md" />
      <button type="button" onClick={onResume} className="flex-1 min-w-0 text-left cursor-pointer">
        <div className="text-[13px] font-medium truncate">{thread.title}</div>
        <div className="text-[11px] text-(--color-fg-subtle) flex items-center gap-2 mt-0.5">
          <span className="font-mono truncate">{thread.modelId}</span>
          <span>·</span>
          <span>{thread.messages.length} msg</span>
          <span>·</span>
          <span>{formatRelative(thread.updatedAt)}</span>
        </div>
      </button>
      {pendingDelete ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-(--color-danger)">Delete?</span>
          <Button size="sm" variant="ghost" onClick={onCancelDelete}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={onConfirmDelete}>Delete</Button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Badge variant="default">{thread.tokenUsage != null ? `${formatNumber(thread.tokenUsage, 0)} tok` : "-"}</Badge>
          <Button variant="ghost" size="icon" aria-label="Export JSON" onClick={() => exportJson(thread)}>
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Export Markdown" onClick={() => exportMarkdown(thread)}>
            <FileText className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Delete" onClick={onAskDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
