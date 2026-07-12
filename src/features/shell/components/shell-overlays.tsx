"use client";
import { useRankings } from "@/features/market/api-rankings";
import { CommandPalette } from "./command-palette";
import { HelpSheet } from "./help-sheet";

/** Mounts the overlays the shell's header advertises. The palette needs the model market; the query
 *  is shared and cached by React Query, so a surface that does not otherwise show models pays for a
 *  cache read, not a fetch. */
export function ShellOverlays({
  helpOpen,
  onCloseHelp,
}: {
  helpOpen: boolean;
  onCloseHelp: () => void;
}) {
  const { data: models = [] } = useRankings();

  return (
    <>
      <CommandPalette models={models} />
      <HelpSheet open={helpOpen} onClose={onCloseHelp} />
    </>
  );
}
