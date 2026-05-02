import { cn } from "@/lib/utils";

export function ScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin]", className)}
      {...props}
    />
  );
}
