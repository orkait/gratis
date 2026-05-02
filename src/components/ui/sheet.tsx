"use client";
import { Dialog as Base } from "@base-ui/react/dialog";
import { cn } from "@/lib/utils";

export const Sheet = Base.Root;
export const SheetTrigger = Base.Trigger;
export const SheetClose = Base.Close;

type SheetContentProps = React.ComponentProps<typeof Base.Popup> & { side?: "right" | "bottom" };

export function SheetContent({ className, side = "right", children, ...props }: SheetContentProps) {
  const sideClasses = side === "right"
    ? "right-0 top-0 h-dvh w-full max-w-[480px] data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full"
    : "bottom-0 left-0 right-0 max-h-[90dvh] data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full";
  return (
    <Base.Portal>
      <Base.Backdrop className="fixed inset-0 z-[1040] bg-black/50 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-[180ms]" />
      <Base.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-[1040] bg-(--color-surface-1) border-(--color-border) flex flex-col transition-transform duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          side === "right" ? "border-l" : "border-t rounded-t-xl",
          sideClasses,
          className,
        )}
        {...props}
      >
        {children}
      </Base.Popup>
    </Base.Portal>
  );
}
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-header" className={cn("h-12 px-5 flex items-center justify-between border-b border-(--color-border)", className)} {...props} />;
}
export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-body" className={cn("flex-1 overflow-auto px-5 py-4", className)} {...props} />;
}
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-footer" className={cn("h-14 px-5 flex items-center justify-end gap-2 border-t border-(--color-border)", className)} {...props} />;
}
