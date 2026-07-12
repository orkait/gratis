"use client";
import { useChatSessionStore } from "@/stores/chat-session-store";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { useAutoScroll } from "../hooks/use-auto-scroll";
import { useChatController } from "../hooks/use-chat-controller";
import { CHAT_COLUMN_CLASS, CHAT_SURFACE_CLASS } from "../lib/chat-config";
import { ChatComposer } from "./chat-composer";
import { ChatEmptyState } from "./chat-empty-state";
import { ChatGreeting } from "./chat-greeting";
import { ChatError, ChatMessageList, TypingIndicator } from "./chat-message-list";
import { ChatToolbar } from "./chat-toolbar";

/** The chat surface, inside the app shell.
 *
 * It has no header of its own: the shell carries the title, the search and the theme toggle, exactly
 * as it does on the market. What is left here is the conversation - toolbar, transcript, composer. */
export function ChatView({ models }: { models: ModelStats[] }) {
  const chatModelId = useChatSessionStore((state) => state.chatModelId);

  if (!chatModelId) return <ChatEmptyState models={models} />;

  // Keyed by model only: lazy thread creation never remounts the view.
  return <ChatConversation key={chatModelId} modelId={chatModelId} models={models} />;
}

function ChatConversation({ modelId, models }: { modelId: string; models: ModelStats[] }) {
  const {
    messages,
    status,
    error,
    isBusy,
    input,
    usedTokens,
    contextTokens,
    handleInputChange,
    handleSubmit,
    handleSuggestion,
    handleStop,
    handleModelChange,
  } = useChatController({ modelId, models });

  const scrollRef = useAutoScroll(messages, status);
  const isEmpty = messages.length === 0;

  return (
    <div className={CHAT_SURFACE_CLASS}>
      <ChatToolbar
        models={models}
        modelId={modelId}
        onModelChange={handleModelChange}
        disabled={isBusy}
        showForkHint={!isEmpty}
        usedTokens={usedTokens}
        contextTokens={contextTokens}
      />

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className={cn(CHAT_COLUMN_CLASS, "py-6 space-y-4")}>
          {isEmpty && <ChatGreeting modelId={modelId} onPick={handleSuggestion} />}
          <ChatMessageList messages={messages} />
          {status === "submitted" && <TypingIndicator />}
          {error && <ChatError message={error.message} />}
        </div>
      </div>

      <ChatComposer
        modelId={modelId}
        value={input}
        isBusy={isBusy}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        onStop={handleStop}
      />
    </div>
  );
}
