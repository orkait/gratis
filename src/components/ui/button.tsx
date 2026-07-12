import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background,color,border] duration-120 ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-(--color-accent) text-(--color-accent-fg) hover:bg-(--color-accent-hover)",
        outline: "border border-(--color-border-strong) bg-(--color-surface-1) text-(--color-fg) hover:bg-(--color-surface-2)",
        secondary: "bg-(--color-surface-2) text-(--color-fg) hover:bg-(--color-surface-3)",
        ghost: "bg-transparent text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg)",
        destructive: "bg-(--color-danger) text-white hover:opacity-90",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = "button", ...props }: ButtonProps) {
  return <button type={type} data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
