"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Square, User, Bot, Sparkles } from "lucide-react";
import Link from "next/link";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { useVaultStore } from "@/lib/stores/vault-store";
import { providerForModel } from "@/lib/vault";
import { useThread, useSaveThread } from "@/lib/query/threads";
import type { ChatMessage } from "@/lib/chat-db";
import type { ModelStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChatMarkdown } from "./chat-markdown";
import { ContextMeter } from "./context-meter";
import { ModelPickerInline } from "./model-picker-inline";
import { estimateTokens, trimToContext } from "@/lib/chat/tokens";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Write a Python function to download a URL with retries.",
  "Explain CRDTs in 5 sentences.",
  "Plan a 3-day Tokyo itinerary, focused on food.",
  "Refactor this SQL: SELECT * FROM users WHERE id IN (SELECT user_id FROM orders);",
];

function uiText(m: UIMessage): string {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function toChatMessages(ms: UIMessage[]): ChatMessage[] {
  return ms
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: uiText(m) }))
    .filter((m) => m.content.length > 0);
}

function toUIMessages(ms: ChatMessage[]): UIMessage[] {
  return ms.map((m, i) => ({
    id: `seed-${i}`,
    role: m.role,
    parts: [{ type: "text", text: m.content }],
  }));
}

type Props = { models: ModelStats[] };

export function ChatView({ models }: Props) {
  const { chatModelId, startNewChat } = useChatSessionStore();

  if (!chatModelId) {
    return <EmptyState models={models} onPick={(id) => startNewChat(id)} />;
  }

  // Keyed by model only: lazy thread creation never remounts the view.
  return <ChatActiveView key={chatModelId} modelId={chatModelId} models={models} />;
}

function ChatActiveView({ modelId, models }: { modelId: string } & Props) {
  const { currentThreadId, setCurrentThreadId, startNewChat, openThread } = useChatSessionStore();
  const { data: thread, isSuccess: threadLoaded } = useThread(currentThreadId);
  const saveThread = useSaveThread();
  const modelCtx = models.find((m) => m.id === modelId)?.ctx ?? 0;

  // modelId is constant per instance (keyed by model). Trim history to the model's
  // context window before sending (sliding window; full history stays in the UI).
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          // Read at send time, not render time: the vault may be unlocked mid-session, and the key
          // must never be captured into a memo that outlives a lock().
          const { keyFor } = useVaultStore.getState();
          const key = keyFor(providerForModel(modelId));
          const cfAccount = keyFor("cloudflare_account_id");
          return {
            body: { messages: trimToContext(messages, modelCtx), model: modelId },
            headers: {
              ...(key ? { "X-Provider-Key": key } : {}),
              ...(cfAccount ? { "X-CF-Account-Id": cfAccount } : {}),
            },
          };
        },
      }),
    [modelId, modelCtx],
  );

  const { messages, sendMessage, status, stop, setMessages, error } = useChat({ transport });

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const isBusy = status === "submitted" || status === "streaming";

  // Load the active thread's messages into the chat when it changes.
  const loadedIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Ghost pointer: currentThreadId references a thread no longer in idb -> fresh chat.
    if (currentThreadId && threadLoaded && thread === null) {
      loadedIdRef.current = null;
      setMessages([]);
      setCurrentThreadId(null);
      return;
    }
    if (currentThreadId && thread && loadedIdRef.current !== thread.id) {
      loadedIdRef.current = thread.id;
      setMessages(toUIMessages(thread.messages));
    } else if (!currentThreadId && loadedIdRef.current !== null) {
      loadedIdRef.current = null;
      setMessages([]);
    }
  }, [currentThreadId, thread, threadLoaded, setMessages, setCurrentThreadId]);

  // Persist exactly once when a turn finishes (streaming -> ready).
  const prevStatus = useRef(status);
  useEffect(() => {
    const was = prevStatus.current;
    prevStatus.current = status;
    if (was !== "streaming" || status !== "ready" || messages.length === 0) return;
    const chatMsgs = toChatMessages(messages);
    if (chatMsgs.length === 0) return;
    void saveThread.mutateAsync({ id: currentThreadId, modelId, messages: chatMsgs }).then((id) => {
      if (!currentThreadId) {
        loadedIdRef.current = id;
        setCurrentThreadId(id);
      }
    });
  }, [status, messages, currentThreadId, modelId, saveThread, setCurrentThreadId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, status]);

  const submit = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isBusy) return;
    setInput("");
    void sendMessage({ text: content });
  };

  // Switching model mid-conversation forks the history into a new thread under
  // the new model (the original thread is preserved). Empty chat just swaps model.
  const onModelChange = (newId: string) => {
    if (newId === modelId || isBusy) return;
    if (messages.length === 0) {
      startNewChat(newId);
      return;
    }
    const carried = toChatMessages(messages);
    void saveThread.mutateAsync({ id: null, modelId: newId, messages: carried }).then((newThreadId) => {
      openThread(newThreadId, newId);
    });
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 h-dvh">
      <header className="h-12 sticky top-0 z-[1020] bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-3">
        <ModelPickerInline models={models} value={modelId} onChange={onModelChange} disabled={isBusy} />
        {messages.length > 0 && (
          <span className="text-[10px] text-(--color-fg-subtle) font-mono">switch model to continue in a new thread</span>
        )}
        <div className="flex-1" />
        <ContextMeter used={messages.length > 0 ? estimateTokens(messages) : null} max={modelCtx || null} estimated />
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="max-w-[760px] mx-auto px-6 py-6 space-y-4">
          {messages.length === 0 && <ChatGreeting modelId={modelId} onPick={(s) => submit(s)} />}
          {messages.map((m) => (
            <MessageRow key={m.id} role={m.role} content={uiText(m)} />
          ))}
          {status === "submitted" && <TypingIndicator />}
          {error && (
            <div className="text-[13px] text-(--color-danger) bg-(--color-danger-soft) rounded-lg px-4 py-2.5">
              <strong>Error:</strong> {error.message}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-(--color-border) bg-(--color-bg)">
        <div className="max-w-[760px] mx-auto px-6 py-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={`Message ${modelId}...`}
            rows={1}
            className="flex-1 resize-none bg-(--color-surface-1) border border-(--color-border) rounded-md px-3 py-2 text-[13px] outline-none focus:border-(--color-accent) max-h-[200px]"
          />
          {isBusy ? (
            <Button onClick={() => stop()} variant="outline" aria-label="Stop">
              <Square className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button onClick={() => submit()} disabled={!input.trim()} aria-label="Send">
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageRow({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-(--color-accent)" : "bg-(--color-surface-2) border border-(--color-border)",
        )}
      >
        {isUser ? <User className="w-4 h-4 text-(--color-accent-fg)" /> : <Bot className="w-4 h-4 text-(--color-fg-muted)" />}
      </div>
      {isUser ? (
        <div className="max-w-[85%] rounded-[18px] px-4 py-2.5 text-[15px] leading-relaxed bg-(--color-accent-soft) text-(--color-fg) whitespace-pre-wrap">
          {content}
        </div>
      ) : (
        // Editorial: assistant replies read like prose, not a chat bubble.
        <div className="max-w-[65ch] min-w-0 pt-1 text-[16px] leading-[1.75] text-(--color-fg)">
          <ChatMarkdown content={content} />
        </div>
      )}
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
        <h2 className="serif text-[30px] font-semibold">How can I help today?</h2>
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
      <h2 className="serif text-[30px] font-semibold">Pick a model to start</h2>
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
