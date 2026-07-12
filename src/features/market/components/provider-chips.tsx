"use client";
import { useCallback } from "react";
import { useFiltersStore } from "@/stores/filters-store";
import { PROVIDER_LIST } from "@/config/providers";
import type { ProviderFilter } from "@/types/model";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { cn } from "@/lib/utils";

const ALL_FILTER = "all" as const;

type ChipSpec = {
  readonly id: ProviderFilter;
  readonly label: string;
  readonly dotVar: string;
  /** The name the avatar keys off. Null for "All", which has no provider. */
  readonly avatarName: string | null;
};

/** Derived from the provider registry: adding a provider adds a chip, with no edit in this file. */
const CHIPS: readonly ChipSpec[] = [
  { id: ALL_FILTER, label: "All", dotVar: "var(--color-fg-muted)", avatarName: null },
  ...PROVIDER_LIST.map((provider) => ({
    id: provider.id as ProviderFilter,
    label: provider.shortLabel,
    dotVar: provider.dotVar,
    avatarName: provider.backendLabel ?? provider.label,
  })),
];

export function ProviderChips() {
  const provider = useFiltersStore((s) => s.filters.provider);
  const setFilter = useFiltersStore((s) => s.setFilter);

  const select = useCallback((next: ProviderFilter) => setFilter("provider", next), [setFilter]);

  return (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
      {CHIPS.map((chip) => (
        <ProviderChip key={chip.id} chip={chip} active={provider === chip.id} onSelect={select} />
      ))}
    </div>
  );
}

/** Its own component so the click handler binds the id by reference, not by a closure in JSX. */
function ProviderChip({
  chip,
  active,
  onSelect,
}: {
  chip: ChipSpec;
  active: boolean;
  onSelect: (id: ProviderFilter) => void;
}) {
  const handleClick = useCallback(() => onSelect(chip.id), [onSelect, chip.id]);

  const tone = active
    ? "bg-(--color-accent-soft) text-(--color-fg) border-(--color-accent)/40"
    : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn(
        "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-medium border whitespace-nowrap transition-colors duration-[120ms] cursor-pointer",
        tone,
      )}
    >
      {chip.avatarName ? (
        <ProviderAvatar provider={chip.avatarName} size="xs" />
      ) : (
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: chip.dotVar }} />
      )}
      {chip.label}
    </button>
  );
}
