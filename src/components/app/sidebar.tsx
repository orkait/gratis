"use client";
import { Zap, Brain, Wrench, Search, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { filters, setFilter, resetFilters } = useStore();

  return (
    <aside className="w-[240px] shrink-0 h-dvh sticky top-0 bg-(--color-bg) border-r border-(--color-border) flex flex-col">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-(--color-border)">
        <div className="w-6 h-6 rounded-md bg-(--color-accent) flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-(--color-accent-fg)" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-semibold tracking-tight">ZeroCostLLM</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-5">
        <Section label="Search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
            <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Model id..." className="pl-8" />
          </div>
        </Section>

        <Section label="Tier">
          <Toggle label="Free only" checked={filters.freeOnly} onChange={(v) => setFilter("freeOnly", v)} />
          <Toggle label="Open source" checked={filters.openOnly} onChange={(v) => setFilter("openOnly", v)} />
        </Section>

        <Section label="Capabilities">
          <div className="grid grid-cols-2 gap-1.5">
            <Chip active={filters.brain} onClick={() => setFilter("brain", !filters.brain)}>
              <Brain className="w-3 h-3" />Brain
            </Chip>
            <Chip active={filters.tools} onClick={() => setFilter("tools", !filters.tools)}>
              <Wrench className="w-3 h-3" />Tools
            </Chip>
          </div>
        </Section>

        <Section label="Hardware">
          <Slider label="Min Params" suffix="B" value={filters.minParams} max={500} step={1} onChange={(v) => setFilter("minParams", v)} />
          <Slider label="Min Context" suffix="K" value={filters.minCtx} max={1_000_000} step={8000} onChange={(v) => setFilter("minCtx", v)} display={(v) => Math.round(v / 1000)} />
        </Section>
      </div>

      <Separator />
      <div className="p-3">
        <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full justify-start">
          <RotateCcw className="w-3.5 h-3.5" /> Reset filters
        </Button>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle) px-1">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full h-8 px-3 rounded-md flex items-center justify-between hover:bg-(--color-surface-1) transition-colors duration-[120ms] cursor-pointer"
    >
      <span className="text-[13px] text-(--color-fg)">{label}</span>
      <span className={cn("relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors duration-[120ms]", checked ? "bg-(--color-accent)" : "bg-(--color-surface-3)")}>
        <span className={cn("inline-block h-3 w-3 rounded-full bg-white transition-transform duration-[120ms]", checked ? "translate-x-[15px]" : "translate-x-[3px]")} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button" className={cn(
      "h-8 px-2 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors duration-[120ms] cursor-pointer border",
      active
        ? "bg-(--color-accent-soft) text-(--color-accent) border-(--color-accent)/40"
        : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)",
    )}>{children}</button>
  );
}

function Slider({ label, value, max, step, suffix, onChange, display }: {
  label: string; value: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void; display?: (v: number) => number;
}) {
  const shown = display ? display(value) : value;
  return (
    <div className="space-y-1.5 px-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-(--color-fg-muted)">{label}</span>
        <span className="font-mono text-(--color-accent)">{shown}{suffix}</span>
      </div>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="w-full h-1 accent-(--color-accent) cursor-pointer" />
    </div>
  );
}
