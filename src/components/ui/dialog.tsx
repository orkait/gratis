"use client";
import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

export const Dialog = Base.Root;
export const DialogTrigger = Base.Trigger;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof Base.Popup>) {
  return (
    <Base.Portal>
      <Base.Backdrop data-slot="dialog-backdrop" className="fixed inset-0 z-[1050] bg-black/60 backdrop-blur-[2px] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-[180ms]" />
      <Base.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-[1050] w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-(--color-surface-1) border border-(--color-border) shadow-[0_24px_64px_oklch(0.05_0.008_260/0.6)] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.97] transition-[opacity,transform] duration-[180ms] ease-out",
          className,
        )}
        {...props}
      >
        {children}
      </Base.Popup>
    </Base.Portal>
  );
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Base.Title>) {
  return <Base.Title data-slot="dialog-title" className={cn("text-[18px] font-semibold tracking-tight", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Base.Description>) {
  return <Base.Description data-slot="dialog-description" className={cn("text-[13px] text-(--color-fg-muted)", className)} {...props} />;
}
export const DialogClose = Base.Close;
