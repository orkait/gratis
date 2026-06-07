export type ModelStats = {
  id: string;
  name: string;
  params: number;
  ctx: number;
  is_free: boolean;
  capability: number;
  brain: boolean;
  tools: boolean;
  open: boolean;
  tps: number | null;
  uptime: number | null;
  provider: string;
  balanced: number;
  value: number;
  intel: number | null;
  intel_coding: number | null;
  intel_math: number | null;
  intel_est: boolean;
};

export type ProviderFilter =
  | "all" | "openrouter" | "ollama" | "aistudio" | "groq" | "cerebras" | "cloudflare";

export const PROVIDER_LABEL: Record<string, string> = {
  Ollama: "ollama",
  "Google AI Studio": "aistudio",
  Groq: "groq",
  Cerebras: "cerebras",
  "Cloudflare Workers AI": "cloudflare",
};
