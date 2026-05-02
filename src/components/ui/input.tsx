import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-8 w-full rounded-md bg-(--color-surface-1) border border-(--color-border) px-2.5 text-[13px] text-(--color-fg) placeholder:text-(--color-fg-subtle) outline-none transition-colors duration-[120ms] focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft)",
        className,
      )}
      {...props}
    />
  );
}
