import { cn } from "@/lib/utils";

export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded text-[10px] font-mono font-medium bg-(--color-surface-2) text-(--color-fg-muted) border border-(--color-border)",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
