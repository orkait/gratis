import { cn } from "@/lib/utils";

type Props = { orientation?: "horizontal" | "vertical" } & React.HTMLAttributes<HTMLDivElement>;

export function Separator({ className, orientation = "horizontal", ...props }: Props) {
  return (
    <div
      data-slot="separator"
      role="separator"
      aria-orientation={orientation}
      className={cn("bg-(--color-border)", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)}
      {...props}
    />
  );
}
