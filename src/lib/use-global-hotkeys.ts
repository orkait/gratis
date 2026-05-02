"use client";
import { useEffect } from "react";
import { findBinding, type KeybindingId } from "./keybindings";

export type HotkeyHandler = (e: KeyboardEvent) => void;

export function useGlobalHotkeys(handlers: Partial<Record<KeybindingId, HotkeyHandler>>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const b = findBinding(e);
      if (!b) return;
      const h = handlers[b.id];
      if (!h) return;
      e.preventDefault();
      h(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handlers]);
}
