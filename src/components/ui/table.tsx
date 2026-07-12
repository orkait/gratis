import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table data-slot="table" className={cn("w-full caption-bottom text-sm", className)} {...props} />;
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead data-slot="thead" className={cn("sticky top-0 z-10 bg-(--color-bg)", className)} {...props} />;
}
export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="tbody" {...props} className={className} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr data-slot="tr" className={cn("border-b border-(--color-border)/60 hover:bg-white/[0.02] transition-colors duration-120", className)} {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th data-slot="th" className={cn("h-9 px-3 text-left align-middle text-xs font-semibold uppercase tracking-wider text-(--color-fg-subtle)", className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-slot="td" className={cn("h-10 px-3 align-middle text-(--color-fg)", className)} {...props} />;
}
