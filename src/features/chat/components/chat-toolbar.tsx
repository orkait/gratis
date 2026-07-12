"use client";
import type { ModelStats } from "@/types/model";
import { ContextMeter } from "./context-meter";
import { ModelPickerInline } from "./model-picker-inline";

/** The conversation's own controls, directly above the transcript.
 *
 * These are NOT header material: the shell's header is global (title, search, theme) and is the same
 * on every surface. Which model you are talking to, and how much of its context you have spent,
 * belong to the conversation - so they sit on the conversation. */
export function ChatToolbar({
  models,
  modelId,
  onModelChange,
  disabled,
  showForkHint,
  usedTokens,
  contextTokens,
}: {
  models: ModelStats[];
  modelId: string;
  onModelChange: (modelId: string) => void;
  disabled: boolean;
  showForkHint: boolean;
  usedTokens: number | null;
  contextTokens: number;
}) {
  return (
    <div className="h-12 shrink-0 flex items-center gap-3 px-6 border-b border-(--color-border)">
      <ModelPickerInline
        models={models}
        value={modelId}
        onChange={onModelChange}
        disabled={disabled}
      />
      {showForkHint && (
        <span className="text-[10px] text-(--color-fg-subtle) font-mono">
          switch model to continue in a new thread
        </span>
      )}
      <div className="flex-1" />
      <ContextMeter
        used={usedTokens}
        max={contextTokens > 0 ? contextTokens : null}
        estimated
      />
    </div>
  );
}
