"use client";
import { memo, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { PROMPT_SUGGESTIONS } from "../lib/chat-config";

type PickSuggestion = (text: string) => void;

/** Shown in place of the first turn, on a conversation that has not started yet. */
export function ChatGreeting({
  modelId,
  onPick,
}: {
  modelId: string;
  onPick: PickSuggestion;
}) {
  return (
    <div className="py-12 text-center space-y-6">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--color-accent-soft) text-(--color-accent)">
        <Sparkles className="w-5 h-5" />
      </div>
      <div>
        <h2 className="serif text-4xl font-semibold">How can I help today?</h2>
        <p className="text-sm text-(--color-fg-muted) mt-1">
          Connected to <span className="font-mono text-(--color-fg)">{modelId}</span>
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-dialog mx-auto">
        {PROMPT_SUGGESTIONS.map((suggestion) => (
          <SuggestionButton key={suggestion} suggestion={suggestion} onPick={onPick} />
        ))}
      </div>
    </div>
  );
}

const SuggestionButton = memo(function SuggestionButton({
  suggestion,
  onPick,
}: {
  suggestion: string;
  onPick: PickSuggestion;
}) {
  const handleClick = useCallback(() => onPick(suggestion), [onPick, suggestion]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-left text-sm text-(--color-fg-muted) hover:text-(--color-fg) bg-(--color-surface-1) hover:bg-(--color-surface-2) border border-(--color-border) rounded-lg px-4 py-3 cursor-pointer transition-colors duration-120"
    >
      {suggestion}
    </button>
  );
});
