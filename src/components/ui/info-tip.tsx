"use client";
import { Tooltip } from "@base-ui-components/react/tooltip";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Base UI tooltip for supplementary/honesty info. Progressive disclosure: the detail is on hover, the
 * signal itself is always visible. Requires <Tooltip.Provider> at the app root (see providers.tsx). */
export function InfoTip({ children, content, className }: { children: ReactNode; content: ReactNode; className?: string }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span />} className={cn("cursor-help", className)}>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6} className="z-(--z-tooltip)">
          <Tooltip.Popup className="max-w-[260px] rounded-md border border-(--color-border) bg-(--color-surface-1) px-2.5 py-1.5 text-[11px] leading-snug text-(--color-fg-muted) shadow-[0_8px_30px_rgb(0_0_0_/_0.35)]">
            {content}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
