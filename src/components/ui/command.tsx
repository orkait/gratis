"use client";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  CommandSeparator,
} from "cmdk";

export { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, CommandSeparator };

export function commandClasses() {
  return {
    root: "flex flex-col bg-(--color-surface-1) rounded-lg overflow-hidden",
    input: "h-12 w-full bg-transparent border-0 border-b border-(--color-border) px-4 text-base text-(--color-fg) outline-none placeholder:text-(--color-fg-subtle)",
    list: "max-h-[400px] overflow-auto p-1",
    item: "flex items-center gap-3 h-9 px-3 rounded-md text-sm text-(--color-fg-muted) data-[selected=true]:bg-(--color-accent-soft) data-[selected=true]:text-(--color-fg) cursor-pointer",
    group: "[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-(--color-fg-subtle) [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2",
    empty: "py-8 text-center text-sm text-(--color-fg-muted)",
  };
}
