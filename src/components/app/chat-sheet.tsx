"use client";
import { useEffect, useRef, useState } from "react";
import { Send, X, Bot, User } from "lucide-react";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
type Msg = { role: "user" | "assistant"; content: string };

export function ChatSheet() {
  const { chatModelId, closeChat } = useStore();
  if (!chatModelId) return null;
  return (
    <Sheet open={!!chatModelId} onOpenChange={(open: boolean) => !open && closeChat()}>
      <SheetContent className="max-w-[560px]">
        <ChatPanel key={chatModelId} modelId={chatModelId} onClose={closeChat} />
      </SheetContent>
    </Sheet>
  );
}

function ChatPanel({ modelId, onClose }: { modelId: string; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(() => [
    { role: "assistant", content: `Connected to **${modelId}**. Send a message to begin.` },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const next: Msg = { role: "user", content: input };
    setMessages((p) => [...p, next]);
    setInput("");
    setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/v1/chat/completions`, {
        model: modelId,
        messages: [...messages.filter((m, i) => !(m.role === "assistant" && i === 0)), next],
      });
      setMessages((p) => [...p, { role: "assistant", content: r.data.choices[0].message.content }]);
    } catch (err: unknown) {
      let detail = "Request failed.";
      if (axios.isAxiosError(err)) {
        const apiErr = err.response?.data?.detail ?? err.response?.data?.error ?? err.message;
        detail = typeof apiErr === "string" ? apiErr : (apiErr?.message ?? err.message);
        if (err.response?.status) detail = `${err.response.status} ${detail}`;
      } else if (err instanceof Error) detail = err.message;
      setMessages((p) => [...p, { role: "assistant", content: `**Error:** ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SheetHeader>
        <div className="flex items-center gap-2 min-w-0">
          <Bot className="w-4 h-4 text-(--color-accent)" />
          <span className="text-[13px] font-mono truncate">{modelId}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
          <X className="w-4 h-4" />
        </Button>
      </SheetHeader>

      <SheetBody className="!p-0 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
              <div className={cn(
                "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                m.role === "user" ? "bg-(--color-accent)" : "bg-(--color-surface-2) border border-(--color-border)",
              )}>
                {m.role === "user" ? <User className="w-3 h-3 text-(--color-accent-fg)" /> : <Bot className="w-3 h-3 text-(--color-fg-muted)" />}
              </div>
              <div className={cn(
                "max-w-[80%] rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap",
                m.role === "user" ? "bg-(--color-accent-soft) text-(--color-fg)" : "bg-(--color-surface-2) text-(--color-fg)",
              )}>{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2 text-(--color-fg-subtle) text-[12px] items-center">
              <Bot className="w-3 h-3" />
              <span className="inline-flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
                <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
              </span>
            </div>
          )}
        </div>

        <div className="border-t border-(--color-border) p-3 flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type message... (Enter to send, Shift+Enter newline)"
            rows={1}
            className="flex-1 resize-none bg-(--color-surface-1) border border-(--color-border) rounded-md px-3 py-2 text-[13px] outline-none focus:border-(--color-accent) max-h-[120px]"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} aria-label="Send">
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SheetBody>
    </>
  );
}
