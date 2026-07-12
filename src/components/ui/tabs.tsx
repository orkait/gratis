"use client";
import { Tabs as Base } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = Base.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof Base.List>) {
  return <Base.List data-slot="tabs-list" className={cn("flex items-center gap-1 border-b border-(--color-border) px-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Base.Tab>) {
  return <Base.Tab data-slot="tabs-trigger" className={cn("h-9 px-3 text-sm text-(--color-fg-muted) data-[selected]:text-(--color-fg) data-[selected]:border-b-2 data-[selected]:border-(--color-accent) -mb-px transition-colors duration-120 cursor-pointer", className)} {...props} />;
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof Base.Panel>) {
  return <Base.Panel data-slot="tabs-content" className={cn("py-4", className)} {...props} />;
}
