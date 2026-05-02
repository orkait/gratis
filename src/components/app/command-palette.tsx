"use client";
import { MessageSquare, Eye, Filter } from "lucide-react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, commandClasses } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import type { ModelStats } from "@/lib/types";

export function CommandPalette({ models }: { models: ModelStats[] }) {
  const { cmdkOpen, setCmdk, openDrawer, openChat, setFilter, resetFilters, closeDrawer } = useStore();
  const cls = commandClasses();

  return (
    <Dialog open={cmdkOpen} onOpenChange={(open) => setCmdk(open)}>
      <DialogContent className="p-0 max-w-[640px] !z-[1090] [&~[data-slot='dialog-backdrop']]:!z-[1089]">
        <Command className={cls.root} loop>
          <CommandInput placeholder="Search models, providers, actions..." className={cls.input} />
          <CommandList className={cls.list}>
            <CommandEmpty className={cls.empty}>No matches.</CommandEmpty>

            <CommandGroup heading="Actions" className={cls.group}>
              <CommandItem className={cls.item} onSelect={() => { resetFilters(); setCmdk(false); }}>
                <Filter className="w-3.5 h-3.5" /> Reset all filters
              </CommandItem>
              <CommandItem className={cls.item} onSelect={() => { setFilter("freeOnly", true); setCmdk(false); }}>
                <Filter className="w-3.5 h-3.5" /> Show free models only
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Models" className={cls.group}>
              {models.slice(0, 30).map((m) => (
                <CommandItem key={m.id} className={cls.item} value={m.id} onSelect={() => { openDrawer(m.id); setCmdk(false); }}>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{m.id}</span>
                  <span className="text-[10px] font-mono text-(--color-fg-subtle)">{m.provider}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Chat with..." className={cls.group}>
              {models.slice(0, 10).map((m) => (
                <CommandItem key={`chat-${m.id}`} className={cls.item} value={`chat ${m.id}`} onSelect={() => { closeDrawer(); openChat(m.id); setCmdk(false); }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{m.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="h-9 border-t border-(--color-border) px-3 flex items-center justify-end gap-3 text-[10px] text-(--color-fg-subtle)">
            <span className="flex items-center gap-1"><Kbd>{"↑"}</Kbd><Kbd>{"↓"}</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>{"↵"}</Kbd> select</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
