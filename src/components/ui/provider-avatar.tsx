import { cn } from "@/lib/utils";

const PROVIDER_VAR: Record<string, string> = {
  "Ollama": "var(--color-provider-ollama)",
  "Google AI Studio": "var(--color-provider-aistudio)",
  "Groq": "var(--color-provider-groq)",
  "Cerebras": "var(--color-provider-cerebras)",
  "Cloudflare Workers AI": "var(--color-provider-cloudflare)",
  "OpenRouter": "var(--color-provider-openrouter)",
};

const FALLBACK_HUES = [340, 25, 60, 95, 130, 175, 210, 250, 290, 315];

function colorForProvider(provider: string): string {
  if (PROVIDER_VAR[provider]) return PROVIDER_VAR[provider];
  let h = 0;
  for (let i = 0; i < provider.length; i++) h = (h * 31 + provider.charCodeAt(i)) >>> 0;
  const hue = FALLBACK_HUES[h % FALLBACK_HUES.length];
  return `oklch(0.65 0.15 ${hue})`;
}

function letterFor(provider: string): string {
  const trimmed = provider.trim();
  if (!trimmed) return "?";
  const first = trimmed[0]?.toUpperCase() ?? "?";
  return first;
}

export type ProviderAvatarProps = {
  provider: string;
  size?: "xs" | "sm" | "md";
  className?: string;
};

export function ProviderAvatar({ provider, size = "sm", className }: ProviderAvatarProps) {
  const sizeClass = size === "xs" ? "w-3.5 h-3.5 text-[8px]" : size === "sm" ? "w-4 h-4 text-[9px]" : "w-5 h-5 text-[10px]";
  return (
    <span
      data-slot="provider-avatar"
      title={provider}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded font-mono font-bold uppercase text-white",
        sizeClass,
        className,
      )}
      style={{ background: colorForProvider(provider) }}
    >
      {letterFor(provider)}
    </span>
  );
}
