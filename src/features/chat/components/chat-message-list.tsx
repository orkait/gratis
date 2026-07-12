"use client";
import { memo } from "react";
import { User, Bot } from "lucide-react";
import type { UIMessage } from "ai";
import { cn } from "@/lib/utils";
import { messageText } from "../lib/messages";
import { ChatMarkdown } from "./chat-markdown";

/** A fragment, not a wrapper: the parent owns the spacing between the greeting, the turns, the
 *  typing indicator and an error, and a <div> here would break that rhythm. */
export function ChatMessageList({ messages }: { messages: UIMessage[] }) {
  return (
    <>
      {messages.map((message) => (
        <MessageRow key={message.id} role={message.role} content={messageText(message)} />
      ))}
    </>
  );
}

/** Memoised on {role, content}: while a reply streams, every settled turn above it would otherwise
 *  re-render (and re-parse its markdown) on every token. */
const MessageRow = memo(function MessageRow({
  role,
  content,
}: {
  role: UIMessage["role"];
  content: string;
}) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-(--color-accent)" : "bg-(--color-surface-2) border border-(--color-border)",
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-(--color-accent-fg)" />
        ) : (
          <Bot className="w-4 h-4 text-(--color-fg-muted)" />
        )}
      </div>
      {isUser ? (
        <div className="max-w-bubble rounded-2xl px-4 py-2.5 text-lg leading-relaxed bg-(--color-accent-soft) text-(--color-fg) whitespace-pre-wrap">
          {content}
        </div>
      ) : (
        // Editorial: assistant replies read like prose, not a chat bubble.
        <div className="max-w-measure min-w-0 pt-1 text-lg leading-prose text-(--color-fg)">
          <ChatMarkdown content={content} />
        </div>
      )}
    </div>
  );
});

export function TypingIndicator() {
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

export function ChatError({ message }: { message: string }) {
  return (
    <div className="text-sm text-(--color-danger) bg-(--color-danger-soft) rounded-lg px-4 py-2.5">
      <strong>Error:</strong> {message}
    </div>
  );
}
