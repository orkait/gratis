"use client";
import { useCallback, type ChangeEvent, type KeyboardEvent } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CHAT_COLUMN_CLASS, SUBMIT_KEY } from "../lib/chat-config";

export function ChatComposer({
  modelId,
  value,
  isBusy,
  onChange,
  onSubmit,
  onStop,
}: {
  modelId: string;
  value: string;
  isBusy: boolean;
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  onStop: () => void;
}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      // Shift+Enter is a newline; bare Enter sends.
      if (event.key !== SUBMIT_KEY || event.shiftKey) return;
      event.preventDefault();
      onSubmit();
    },
    [onSubmit],
  );

  return (
    <div className="shrink-0 border-t border-(--color-border) bg-(--color-bg)">
      <div className={cn(CHAT_COLUMN_CLASS, "py-3 flex gap-2")}>
        <textarea
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${modelId}...`}
          rows={1}
          className="flex-1 resize-none bg-(--color-surface-1) border border-(--color-border) rounded-md px-3 py-2 text-sm outline-none focus:border-(--color-accent) max-h-code-block"
        />
        {isBusy ? (
          <Button onClick={onStop} variant="outline" aria-label="Stop">
            <Square className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button onClick={onSubmit} disabled={!value.trim()} aria-label="Send">
            <Send className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
