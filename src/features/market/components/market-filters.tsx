"use client";
import { Search, RotateCcw } from "lucide-react";
import { useFiltersStore } from "@/stores/filters-store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CAPABILITY_FILTERS, HARDWARE_SLIDERS, TIER_FILTERS, type ChipSpec, type SliderSpec, type ToggleSpec } from "../lib/filter-config";
import { useFilterHandlers } from "../hooks/use-filter-handlers";

/** The market's sidebar panel: filters only. The shell owns the logo, the nav and the chrome. */
export function MarketFilters() {
  const { filters } = useFiltersStore();
  const { setBoolean, setNumber, setSearch, reset } = useFilterHandlers();

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-3 space-y-5">
        <FilterSection label="Search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
            <Input value={filters.search} onChange={setSearch} placeholder="Model id..." className="pl-8" />
          </div>
        </FilterSection>

        <FilterSection label="Tier">
          {TIER_FILTERS.map((spec) => (
            <FilterToggle key={spec.key} spec={spec} checked={filters[spec.key]} onToggle={setBoolean} />
          ))}
        </FilterSection>

        <FilterSection label="Capabilities">
          <div className="grid grid-cols-2 gap-1.5">
            {CAPABILITY_FILTERS.map((spec) => (
              <CapabilityChip key={spec.key} spec={spec} active={filters[spec.key]} onToggle={setBoolean} />
            ))}
          </div>
        </FilterSection>

        <FilterSection label="Hardware">
          {HARDWARE_SLIDERS.map((spec) => (
            <RangeSlider key={spec.key} spec={spec} value={filters[spec.key]} onChange={setNumber} />
          ))}
        </FilterSection>
      </div>

      <div className="p-3 border-t border-(--color-border)">
        <Button variant="ghost" size="sm" onClick={reset} className="w-full justify-start">
          <RotateCcw className="w-3.5 h-3.5" /> Reset filters
        </Button>
      </div>
    </div>
  );
}

function FilterSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold uppercase tracking-wider text-(--color-fg-subtle) px-1">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

type BooleanToggle = (key: ToggleSpec["key"], next: boolean) => void;
type NumberChange = (key: SliderSpec["key"], next: number) => void;

function FilterToggle({ spec, checked, onToggle }: { spec: ToggleSpec; checked: boolean; onToggle: BooleanToggle }) {
  // Declared above the return and passed by reference - no closure rebuilt per render.
  const handleClick = () => onToggle(spec.key, !checked);
  const knobPosition = checked ? "translate-x-[15px]" : "translate-x-[3px]";
  const trackColor = checked ? "bg-(--color-accent)" : "bg-(--color-surface-3)";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleClick}
      className="w-full h-8 px-3 rounded-md flex items-center justify-between hover:bg-(--color-surface-1) transition-colors duration-[120ms] cursor-pointer"
    >
      <span className="text-sm text-(--color-fg)">{spec.label}</span>
      <span className={cn("relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors duration-[120ms]", trackColor)}>
        <span className={cn("inline-block h-3 w-3 rounded-full bg-white transition-transform duration-[120ms]", knobPosition)} />
      </span>
    </button>
  );
}

function CapabilityChip({ spec, active, onToggle }: { spec: ChipSpec; active: boolean; onToggle: BooleanToggle }) {
  const handleClick = () => onToggle(spec.key, !active);
  const Icon = spec.icon;
  const tone = active
    ? "bg-(--color-accent-soft) text-(--color-accent) border-(--color-accent)/40"
    : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn("h-8 px-2 rounded-md flex items-center justify-center gap-1.5 text-sm font-medium transition-colors duration-[120ms] cursor-pointer border", tone)}
    >
      <Icon className="w-3 h-3" />
      {spec.label}
    </button>
  );
}

function RangeSlider({ spec, value, onChange }: { spec: SliderSpec; value: number; onChange: NumberChange }) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => onChange(spec.key, Number(event.target.value));

  return (
    <div className="space-y-1.5 px-1">
      <div className="flex justify-between text-xs">
        <span className="text-(--color-fg-muted)">{spec.label}</span>
        <span className="font-mono text-(--color-accent)">
          {spec.display(value)}
          {spec.suffix}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={spec.max}
        step={spec.step}
        value={value}
        onChange={handleChange}
        aria-label={spec.label}
        className="w-full h-1 accent-(--color-accent) cursor-pointer"
      />
    </div>
  );
}
