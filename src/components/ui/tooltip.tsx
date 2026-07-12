"use client";
import { Tooltip as Base } from "@base-ui/react/tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = Base.Provider;
export const Tooltip = Base.Root;
export const TooltipTrigger = Base.Trigger;
export function TooltipContent({ className, children, ...props }: React.ComponentProps<typeof Base.Popup>) {
  return (
    <Base.Portal>
      <Base.Positioner sideOffset={6}>
        <Base.Popup data-slot="tooltip-content" className={cn("rounded-md bg-(--color-surface-3) border border-(--color-border) px-2 py-1 text-xs text-(--color-fg)", className)} {...props}>
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
