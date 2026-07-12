"use client";
import { useCallback, useMemo, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";

/** The chrome every surface shares: the command palette and the shortcuts sheet, plus the keys that
 *  open and close them. A surface that renders <AppShell> owns a search button and a help button, so
 *  it must own the overlays behind them - otherwise those buttons are silent no-ops.
 *
 *  `onEscape` lets a page close its own overlay last, after the shell's own ones. */

export type ShellOverlaysState = {
  helpOpen: boolean;
  openHelp: () => void;
  closeHelp: () => void;
};

export function useShellOverlays({ onEscape }: { onEscape?: () => void } = {}): ShellOverlaysState {
  const { cmdkOpen, setCmdk } = useUIStore();
  const [helpOpen, setHelpOpen] = useState(false);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  const toggleCmdk = useCallback(() => setCmdk(!cmdkOpen), [setCmdk, cmdkOpen]);
  const toggleHelp = useCallback(() => setHelpOpen((open) => !open), []);

  const closeTopOverlay = useCallback(() => {
    if (cmdkOpen) {
      setCmdk(false);
      return;
    }
    if (helpOpen) {
      setHelpOpen(false);
      return;
    }
    onEscape?.();
  }, [cmdkOpen, helpOpen, setCmdk, onEscape]);

  const handlers = useMemo(
    () => ({
      "cmdk.toggle": toggleCmdk,
      "help.toggle": toggleHelp,
      "overlay.close": closeTopOverlay,
    }),
    [toggleCmdk, toggleHelp, closeTopOverlay],
  );

  useGlobalHotkeys(handlers);

  return { helpOpen, openHelp, closeHelp };
}
