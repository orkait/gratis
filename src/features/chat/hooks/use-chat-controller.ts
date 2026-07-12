"use client";
import { useCallback, useMemo, useState, type ChangeEvent } from "react";
import { useChat } from "@ai-sdk/react";
import type { ChatStatus, UIMessage } from "ai";
import { useChatSessionStore } from "@/stores/chat-session-store";
import type { ModelStats } from "@/types/model";
import { useSaveThread } from "../api-threads";
import { toChatMessages } from "../lib/messages";
import { estimateTokens } from "../lib/tokens";
import { useChatTransport } from "./use-chat-transport";
import { useThreadSync } from "./use-thread-sync";

export type ChatController = {
  messages: UIMessage[];
  status: ChatStatus;
  error: Error | undefined;
  isBusy: boolean;
  input: string;
  /** Estimated prompt tokens, or null on an empty conversation. */
  usedTokens: number | null;
  /** The model's context window; 0 when the market does not report one. */
  contextTokens: number;
  handleInputChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  handleSubmit: () => void;
  handleSuggestion: (text: string) => void;
  handleStop: () => void;
  handleModelChange: (modelId: string) => void;
};

type ChatControllerArgs = {
  modelId: string;
  models: readonly ModelStats[];
};

/** Everything the chat surface does, minus how it looks.
 *
 * The view below this is a rendering of {messages, status, input} and nothing more; every decision -
 * what to send, when to persist, what switching model means - is made here. */
export function useChatController({ modelId, models }: ChatControllerArgs): ChatController {
  const startNewChat = useChatSessionStore((state) => state.startNewChat);
  const openThread = useChatSessionStore((state) => state.openThread);
  const saveThread = useSaveThread();

  const contextTokens = useMemo(
    () => models.find((model) => model.id === modelId)?.ctx ?? 0,
    [models, modelId],
  );

  const transport = useChatTransport(modelId, contextTokens);
  const { messages, sendMessage, status, stop, setMessages, error } = useChat({ transport });

  useThreadSync({ modelId, messages, status, setMessages });

  const [input, setInput] = useState("");
  const isBusy = status === "submitted" || status === "streaming";

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || isBusy) return;
      setInput("");
      void sendMessage({ text: content });
    },
    [isBusy, sendMessage],
  );

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => setInput(event.target.value),
    [],
  );

  const handleSubmit = useCallback(() => send(input), [send, input]);
  const handleSuggestion = useCallback((text: string) => send(text), [send]);
  const handleStop = useCallback(() => stop(), [stop]);

  /** Switching model mid-conversation FORKS: the carried history is saved as a new thread under the
   *  new model and opened, leaving the original thread untouched. An empty chat just swaps model. */
  const handleModelChange = useCallback(
    (nextModelId: string) => {
      if (nextModelId === modelId || isBusy) return;
      if (messages.length === 0) {
        startNewChat(nextModelId);
        return;
      }
      const carried = toChatMessages(messages);
      void saveThread
        .mutateAsync({ id: null, modelId: nextModelId, messages: carried })
        .then((newThreadId) => openThread(newThreadId, nextModelId));
    },
    [modelId, isBusy, messages, startNewChat, saveThread, openThread],
  );

  const usedTokens = messages.length > 0 ? estimateTokens(messages) : null;

  return {
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
  };
}
