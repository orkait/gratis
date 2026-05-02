import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded font-mono text-[11px] font-medium px-1.5 h-[18px] tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-(--color-surface-2) text-(--color-fg-muted) border border-(--color-border)",
        success: "bg-(--color-success-soft) text-(--color-success)",
        warning: "bg-(--color-warning-soft) text-(--color-warning)",
        danger: "bg-(--color-danger-soft) text-(--color-danger)",
        info: "bg-(--color-info-soft) text-(--color-info)",
        accent: "bg-(--color-accent-soft) text-(--color-accent)",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
