"use client";
import { useCallback } from "react";
import { TriangleAlert } from "lucide-react";
import { ToggleGroup } from "@base-ui-components/react/toggle-group";
import { Toggle } from "@base-ui-components/react/toggle";
import { useFiltersStore, type Lens, type ViewMode } from "@/stores/filters-store";
import { cn } from "@/lib/utils";
import { LENSES, VIEW_MODES, type LensSpec } from "../lib/lens-config";

const VIEW_TOGGLE_CLASS = cn(
  "h-6 px-2.5 rounded text-xs font-mono uppercase tracking-wide cursor-pointer transition-colors duration-150",
  "text-(--color-fg-subtle) hover:text-(--color-fg)",
  "data-[pressed]:bg-(--color-accent-soft) data-[pressed]:text-(--color-accent)",
);

const LENS_CARD_CLASS = cn(
  "group flex flex-col gap-1 items-start text-left px-3 py-2.5 rounded-lg border cursor-pointer transition-all duration-150",
  "border-(--color-border) bg-(--color-surface-1) hover:border-(--color-fg-subtle)/40 hover:bg-(--color-surface-2)",
  "data-[pressed]:border-(--color-accent) data-[pressed]:bg-(--color-accent-soft)",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-accent)/40",
);

export function TaskLens() {
  const lens = useFiltersStore((s) => s.lens);
  const view = useFiltersStore((s) => s.view);
  const setLens = useFiltersStore((s) => s.setLens);
  const setView = useFiltersStore((s) => s.setView);

  // Base UI hands back an array. Guard the empty case (deselect) rather than assert with `as`.
  const handleViewChange = useCallback(
    (next: string[]) => {
      const [value] = next;
      if (isViewMode(value)) setView(value);
    },
    [setView],
  );

  const handleLensChange = useCallback(
    (next: string[]) => {
      const [value] = next;
      if (isLens(value)) setLens(value);
    },
    [setLens],
  );

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-mono uppercase tracking-eyebrow text-(--color-fg-subtle)">
          What are you building?
        </div>

        <ToggleGroup
          value={[view]}
          onValueChange={handleViewChange}
          className="flex items-center gap-0.5 p-0.5 rounded-md border border-(--color-border) bg-(--color-surface-1)"
        >
          {VIEW_MODES.map((mode) => (
            <Toggle key={mode.id} value={mode.id} className={VIEW_TOGGLE_CLASS}>
              {mode.label}
            </Toggle>
          ))}
        </ToggleGroup>
      </div>

      <ToggleGroup
        value={[lens]}
        onValueChange={handleLensChange}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5"
      >
        {LENSES.map((spec) => (
          <LensCard key={spec.id} spec={spec} />
        ))}
      </ToggleGroup>

      <EstimatedNotice lens={lens} />
    </div>
  );
}

/** A lens that ranks on inferred data must say so where the ranking is read, not in a tooltip
 *  nobody opens. Silence here is a claim we cannot back. */
function EstimatedNotice({ lens }: { lens: Lens }) {
  const spec = LENSES.find((candidate) => candidate.id === lens);
  if (!spec?.estimated) return null;

  return (
    <div className="mt-2 flex items-start gap-1.5 text-xs text-(--color-warning)">
      <TriangleAlert className="w-3.5 h-3.5 mt-px shrink-0" />
      <span>{spec.estimated}</span>
    </div>
  );
}

function LensCard({ spec }: { spec: LensSpec }) {
  const Icon = spec.icon;

  return (
    <Toggle value={spec.id} className={LENS_CARD_CLASS}>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-(--color-fg-subtle) group-data-[pressed]:text-(--color-accent)" />
        <span className="text-sm font-medium text-(--color-fg) group-data-[pressed]:text-(--color-accent)">
          {spec.label}
        </span>
      </div>
      <span className="text-xs font-mono text-(--color-fg-subtle)/80">{spec.hint}</span>
    </Toggle>
  );
}

/** Type guards instead of `as Lens` casts: an unknown value is rejected, not forced. */
function isLens(value: string | undefined): value is Lens {
  return LENSES.some((spec) => spec.id === value);
}

function isViewMode(value: string | undefined): value is ViewMode {
  return VIEW_MODES.some((spec) => spec.id === value);
}
