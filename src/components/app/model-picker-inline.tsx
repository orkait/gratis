"use client";
import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, commandClasses } from "@/components/ui/command";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { Badge } from "@/components/ui/badge";
import type { ModelStats } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ModelPickerInline({ models, value, onChange, disabled }: {
  models: ModelStats[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const cls = commandClasses();
  const current = useMemo(() => models.find((m) => m.id === value), [models, value]);

  const free = useMemo(() => models.filter((m) => m.is_free).slice(0, 50), [models]);
  const paid = useMemo(() => models.filter((m) => !m.is_free).slice(0, 50), [models]);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          "h-8 px-2.5 rounded-md flex items-center gap-2 text-[12px] border border-(--color-border) bg-(--color-surface-1) hover:bg-(--color-surface-2) cursor-pointer transition-colors duration-[120ms]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {current && <ProviderAvatar provider={current.provider} size="xs" />}
        <span className="font-mono truncate max-w-[260px]">{value || "Pick a model"}</span>
        <ChevronDown className="w-3 h-3 text-(--color-fg-subtle)" />
      </button>

      <Dialog open={open} onOpenChange={(v: boolean) => setOpen(v)}>
        <DialogContent className="p-0 max-w-[640px]">
          <Command className={cls.root} loop>
            <CommandInput placeholder="Search models..." className={cls.input} />
            <CommandList className={cls.list}>
              <CommandEmpty className={cls.empty}>No models match.</CommandEmpty>

              <CommandGroup heading="Free" className={cls.group}>
                {free.map((m) => (
                  <CommandItem
                    key={m.id}
                    className={cls.item}
                    value={`${m.id} ${m.provider}`}
                    onSelect={() => { onChange(m.id); setOpen(false); }}
                  >
                    <ProviderAvatar provider={m.provider} size="xs" />
                    <span className="flex-1 truncate">{m.id}</span>
                    <Badge variant="success">FREE</Badge>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandGroup heading="Paid" className={cls.group}>
                {paid.map((m) => (
                  <CommandItem
                    key={m.id}
                    className={cls.item}
                    value={`${m.id} ${m.provider}`}
                    onSelect={() => { onChange(m.id); setOpen(false); }}
                  >
                    <ProviderAvatar provider={m.provider} size="xs" />
                    <span className="flex-1 truncate">{m.id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
