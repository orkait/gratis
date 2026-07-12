import { cn } from "@/lib/utils";

export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex items-center justify-center min-w-5 h-toggle-thumb px-1 rounded text-xs font-mono font-medium bg-(--color-surface-2) text-(--color-fg-muted) border border-(--color-border)",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
