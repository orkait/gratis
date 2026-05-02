"use client";
import { useStore } from "@/lib/store";
import type { ProviderFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDERS: { id: ProviderFilter; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "var(--color-fg-muted)" },
  { id: "openrouter", label: "OpenRouter", dot: "var(--color-provider-openrouter)" },
  { id: "ollama", label: "Ollama", dot: "var(--color-provider-ollama)" },
  { id: "aistudio", label: "AI Studio", dot: "var(--color-provider-aistudio)" },
  { id: "groq", label: "Groq", dot: "var(--color-provider-groq)" },
  { id: "cerebras", label: "Cerebras", dot: "var(--color-provider-cerebras)" },
  { id: "cloudflare", label: "Cloudflare", dot: "var(--color-provider-cloudflare)" },
];

export function ProviderChips() {
  const { filters, setFilter } = useStore();
  return (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
      {PROVIDERS.map((p) => {
        const active = filters.provider === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilter("provider", p.id)}
            className={cn(
              "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-medium border whitespace-nowrap transition-colors duration-[120ms] cursor-pointer",
              active
                ? "bg-(--color-accent-soft) text-(--color-fg) border-(--color-accent)/40"
                : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)",
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
