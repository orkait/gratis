"use client";
import { useCallback } from "react";

const ACTIVATION_KEYS = new Set(["Enter", " "]);

/** A table row is a button. Click and Enter/Space must do the same thing, and the chat action nested
 * inside it must not also open the drawer - hence the explicit stopPropagation. */
export function useRowActivation(
  modelId: string,
  onOpen: (id: string) => void,
  onChat: (id: string) => void,
) {
  const activate = useCallback(() => onOpen(modelId), [onOpen, modelId]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!ACTIVATION_KEYS.has(event.key)) return;
      event.preventDefault();
      onOpen(modelId);
    },
    [onOpen, modelId],
  );

  const handleChat = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      onChat(modelId);
    },
    [onChat, modelId],
  );

  return { activate, handleKeyDown, handleChat };
}
