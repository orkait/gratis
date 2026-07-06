export type ModelScores = {
  intelligence: number;
  speed: number;
  coding: number;
  math: number;
  value: number;
  affordability: number;
  tool_use: number;
  reasoning: number;
  instruction: number;
  knowledge: number;
  context: number;
  reliability: number;
  fit_chat: number;
  fit_code: number;
  fit_math: number;
  fit_agent: number;
  fit_budget: number;
  fit_fast: number;
  overall: number;
};

export type Archetype =
  | "flagship" | "code-specialist" | "reasoner" | "agent" | "speedster" | "budget" | "workhorse";

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
  price_in?: number; // present for priced (OpenRouter) models; absent on free provider lanes
  price_out?: number;
  intel: number | null;
  intel_coding: number | null;
  intel_math: number | null;
  intel_est: boolean;
  // Composite scoring (backend /v1/rankings). Optional so a stale/partial payload still types.
  scores?: ModelScores;
  archetype?: Archetype;
  badges?: string[];
  bench_count?: number;         // how many community benchmarks (GPQA, LiveCodeBench, tau-bench, ...) grounded the scores
  consensus?: number | null;    // 0..100 cross-benchmark agreement — low = a contested score, don't take at face value
  confidence?: "high" | "medium" | "low"; // how much to trust this row (bench coverage + agreement + estimate flag)
  // Human-preference axis (LMArena Elo) + where it disagrees with the benchmark composite.
  arena_elo?: number | null;
  arena_votes?: number | null;
  preference?: number | null;   // 0..100 normalized human-preference Elo
  divergence?: "aligned" | "bench-favored" | "human-favored" | null;
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
