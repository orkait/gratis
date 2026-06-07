"use client";
import { Search, HelpCircle } from "lucide-react";
import { useUIStore } from "@/lib/stores/ui-store";
import { Kbd } from "@/components/ui/kbd";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Header({ count, onHelpClick }: { count: number; onHelpClick: () => void }) {
  const { setCmdk } = useUIStore();
  return (
    <header className="h-12 sticky top-0 z-[1020] bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-[14px] font-semibold tracking-tight">Market</h1>
        <span className="text-[11px] font-mono text-(--color-fg-subtle)">{count} models</span>
      </div>

      <button
        type="button"
        onClick={() => setCmdk(true)}
        className="flex-1 max-w-md mx-auto h-7 flex items-center gap-2 px-2.5 rounded-md bg-(--color-surface-1) border border-(--color-border) text-(--color-fg-subtle) hover:border-(--color-border-strong) transition-colors duration-[120ms] cursor-pointer"
      >
        <Search className="w-3 h-3" />
        <span className="flex-1 text-left text-[12px]">Search models, providers, actions...</span>
        <Kbd>{"⌘"}</Kbd><Kbd>K</Kbd>
      </button>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-(--color-surface-1) border border-(--color-border)">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-(--color-success) opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-(--color-success)" />
          </span>
          <span className="text-[10px] font-mono text-(--color-fg-muted)">live</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onHelpClick} aria-label="Keyboard shortcuts">
          <HelpCircle className="w-3.5 h-3.5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
