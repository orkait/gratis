"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { Send, User, Bot, Sparkles } from "lucide-react";
import Link from "next/link";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { useChatThread } from "@/lib/use-chat-thread";
import type { ChatMessage } from "@/lib/chat-db";
import type { ModelStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "./chat-markdown";
import { ContextMeter } from "./context-meter";
import { ModelPickerInline } from "./model-picker-inline";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const SUGGESTIONS = [
  "Write a Python function to download a URL with retries.",
  "Explain CRDTs in 5 sentences.",
  "Plan a 3-day Tokyo itinerary, focused on food.",
  "Refactor this SQL: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);",
];

type Props = {
  models: ModelStats[];
  onThreadChange: () => void;
};

export function ChatView({ models, onThreadChange }: Props) {
  const { chatModelId, currentThreadId, setCurrentThreadId, startNewChat } = useChatSessionStore();
  const effectiveModelId = chatModelId ?? "zero-cost-intelligent";

  if (!chatModelId) {
    return <EmptyState models={models} onPick={(id) => startNewChat(id)} />;
  }

  return (
    <ChatActiveView
      key={effectiveModelId}
      modelId={effectiveModelId}
      threadId={currentThreadId}
      models={models}
      onThreadCreated={(id) => { setCurrentThreadId(id); onThreadChange(); }}
      onModelChange={(id) => startNewChat(id)}
    />
  );
}

function ChatActiveView({
  modelId,
  threadId,
  models,
  onThreadCreated,
  onModelChange,
}: {
  modelId: string;
  threadId: string | null;
  models: ModelStats[];
  onThreadCreated: (id: string) => void;
  onModelChange: (id: string) => void;
}) {
  const { thread, loading: threadLoading, setMessages, setTokenUsage } = useChatThread(modelId, threadId, onThreadCreated);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = thread?.messages ?? [];
  const lastTokens = thread?.tokenUsage ?? null;
  const modelCtx = models.find((m) => m.id === modelId)?.ctx ?? null;
  const lockedModel = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next: ChatMessage = { role: "user", content };
    const withUser = [...messages, next];
    await setMessages(withUser);
    setInput("");
    setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/v1/chat/completions`, {
        model: modelId,
        messages: withUser,
      });
      const assistant: ChatMessage = { role: "assistant", content: r.data.choices[0].message.content };
      await setMessages([...withUser, assistant]);
      const usage = r.data.usage;
      const used = usage?.prompt_tokens ?? usage?.total_tokens ?? null;
      if (typeof used === "number") setTokenUsage(used);
    } catch (err: unknown) {
      let detail = "Request failed.";
      if (axios.isAxiosError(err)) {
        const apiErr = err.response?.data?.detail ?? err.response?.data?.error ?? err.message;
        detail = typeof apiErr === "string" ? apiErr : (apiErr?.message ?? err.message);
        if (err.response?.status) detail = `${err.response.status} ${detail}`;
      } else if (err instanceof Error) detail = err.message;
      await setMessages([...withUser, { role: "assistant", content: `**Error:** ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-dvh">
      <header className="h-12 sticky top-0 z-[1020] bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-3">
        <ModelPickerInline models={models} value={modelId} onChange={onModelChange} disabled={lockedModel} />
        {lockedModel && (
          <span className="text-[10px] text-(--color-fg-subtle) font-mono">model locked after first message</span>
        )}
        <div className="flex-1" />
        <ContextMeter used={lastTokens} max={modelCtx} />
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && !threadLoading && (
            <ChatGreeting modelId={modelId} onPick={(s) => void send(s)} />
          )}
          {messages.map((m, i) => (
            <MessageRow key={i} message={m} />
          ))}
          {loading && <TypingIndicator />}
        </div>
      </div>

      <div className="border-t border-(--color-border) bg-(--color-bg)">
        <div className="max-w-[760px] mx-auto px-6 py-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={`Message ${modelId}...`}
            rows={1}
            className="flex-1 resize-none bg-(--color-surface-1) border border-(--color-border) rounded-md px-3 py-2 text-[13px] outline-none focus:border-(--color-accent) max-h-[200px]"
            disabled={loading || threadLoading}
          />
          <Button onClick={() => void send()} disabled={loading || threadLoading || !input.trim()} aria-label="Send">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <div className={cn("flex gap-2", message.role === "user" && "flex-row-reverse")}>
      <div className={cn(
        "w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5",
        message.role === "user" ? "bg-(--color-accent)" : "bg-(--color-surface-2) border border-(--color-border)",
      )}>
        {message.role === "user" ? <User className="w-3.5 h-3.5 text-(--color-accent-fg)" /> : <Bot className="w-3.5 h-3.5 text-(--color-fg-muted)" />}
      </div>
      <div className={cn(
        "max-w-[85%] rounded-lg px-4 py-2.5 text-[14px] leading-relaxed",
        message.role === "user"
          ? "bg-(--color-accent-soft) text-(--color-fg) whitespace-pre-wrap"
          : "bg-(--color-surface-1) text-(--color-fg)",
      )}>
        {message.role === "user" ? message.content : <ChatMarkdown content={message.content} />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 bg-(--color-surface-2) border border-(--color-border)">
        <Bot className="w-3.5 h-3.5 text-(--color-fg-muted)" />
      </div>
      <div className="rounded-lg px-4 py-3 bg-(--color-surface-1)">
        <span className="inline-flex gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-(--color-fg-subtle) animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-(--color-fg-subtle) animate-pulse [animation-delay:0.2s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-(--color-fg-subtle) animate-pulse [animation-delay:0.4s]" />
        </span>
      </div>
    </div>
  );
}

function ChatGreeting({ modelId, onPick }: { modelId: string; onPick: (text: string) => void }) {
  return (
    <div className="py-12 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--color-accent-soft) text-(--color-accent)">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-[20px] font-semibold tracking-tight">How can I help today?</h2>
        <p className="text-[13px] text-(--color-fg-muted) mt-1">
          Connected to <span className="font-mono text-(--color-fg)">{modelId}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[640px] mx-auto">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="text-left text-[13px] text-(--color-fg-muted) hover:text-(--color-fg) bg-(--color-surface-1) hover:bg-(--color-surface-2) border border-(--color-border) rounded-lg px-4 py-3 cursor-pointer transition-colors duration-[120ms]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ models, onPick }: { models: ModelStats[]; onPick: (id: string) => void }) {
  const top = models.filter((m) => m.is_free).slice(0, 6);
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-w-0 h-dvh p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--color-accent-soft) text-(--color-accent) mb-4">
        <Sparkles className="w-5 h-5" />
      </div>
      <h2 className="text-[20px] font-semibold tracking-tight">Pick a model to start</h2>
      <p className="text-[13px] text-(--color-fg-muted) mt-1 mb-6">300+ free models across 7 providers.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[640px] w-full">
        {top.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onPick(m.id)}
            className="text-left text-[13px] bg-(--color-surface-1) hover:bg-(--color-surface-2) border border-(--color-border) rounded-lg px-4 py-3 cursor-pointer transition-colors duration-[120ms]"
          >
            <div className="font-mono text-(--color-fg) truncate">{m.id}</div>
            <div className="text-[11px] text-(--color-fg-subtle) mt-0.5">{m.provider} · score {m.balanced.toFixed(1)}</div>
          </button>
        ))}
      </div>
      <div className="mt-6 text-[12px] text-(--color-fg-subtle)">
        Or browse the full <Link href="/models" className="text-(--color-accent) underline underline-offset-2">model market</Link>.
      </div>
    </div>
  );
}
