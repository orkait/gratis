"use client";
import { memo, useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Command,
  CommandInput,
  CommandList,
  CommandItem,
  CommandGroup,
  CommandEmpty,
  commandClasses,
} from "@/components/ui/command";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { Badge } from "@/components/ui/badge";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";
import { MODEL_PICKER_GROUP_LIMIT } from "../lib/chat-config";

type SelectModel = (modelId: string) => void;

export function ModelPickerInline({
  models,
  value,
  onChange,
  disabled,
}: {
  models: ModelStats[];
  value: string;
  onChange: SelectModel;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const classes = commandClasses();

  const current = useMemo(() => models.find((model) => model.id === value), [models, value]);
  const free = useMemo(
    () => models.filter((model) => model.is_free).slice(0, MODEL_PICKER_GROUP_LIMIT),
    [models],
  );
  const paid = useMemo(
    () => models.filter((model) => !model.is_free).slice(0, MODEL_PICKER_GROUP_LIMIT),
    [models],
  );

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleOpenChange = useCallback((next: boolean) => setOpen(next), []);

  const handleSelect = useCallback(
    (modelId: string) => {
      onChange(modelId);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          "h-8 px-2.5 rounded-md flex items-center gap-2 text-sm border border-(--color-border) bg-(--color-surface-1) hover:bg-(--color-surface-2) cursor-pointer transition-colors duration-[120ms]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {current && <ProviderAvatar provider={current.provider} size="xs" />}
        <span className="font-mono truncate max-w-[260px]">{value || "Pick a model"}</span>
        <ChevronDown className="w-3 h-3 text-(--color-fg-subtle)" />
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="p-0 max-w-[640px]">
          <Command className={classes.root} loop>
            <CommandInput placeholder="Search models..." className={classes.input} />
            <CommandList className={classes.list}>
              <CommandEmpty className={classes.empty}>No models match.</CommandEmpty>

              <CommandGroup heading="Free" className={classes.group}>
                {free.map((model) => (
                  <ModelOption
                    key={model.id}
                    model={model}
                    className={classes.item}
                    onSelect={handleSelect}
                    showFreeBadge
                  />
                ))}
              </CommandGroup>

              <CommandGroup heading="Paid" className={classes.group}>
                {paid.map((model) => (
                  <ModelOption
                    key={model.id}
                    model={model}
                    className={classes.item}
                    onSelect={handleSelect}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}

const ModelOption = memo(function ModelOption({
  model,
  className,
  onSelect,
  showFreeBadge,
}: {
  model: ModelStats;
  className: string;
  onSelect: SelectModel;
  showFreeBadge?: boolean;
}) {
  const handleSelect = useCallback(() => onSelect(model.id), [onSelect, model.id]);

  return (
    <CommandItem
      className={className}
      // cmdk matches against this string, so the provider stays searchable even though only the id
      // is shown.
      value={`${model.id} ${model.provider}`}
      onSelect={handleSelect}
    >
      <ProviderAvatar provider={model.provider} size="xs" />
      <span className="flex-1 truncate">{model.id}</span>
      {showFreeBadge && <Badge variant="success">FREE</Badge>}
    </CommandItem>
  );
});
