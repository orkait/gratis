/** The provider registry: id, display name, model-id prefix, and the credentials it needs.
 *
 * This is the ONLY place a provider is described. Previously the id, the label, the model-id prefix
 * and the avatar colour were re-declared in six different files, so adding a provider meant finding
 * all six. The backend's resolve_model() mirrors these prefixes; they are a contract.
 */

export const PROVIDER_IDS = [
  "groq",
  "openrouter",
  "cerebras",
  "aistudio",
  "ollama",
  "cloudflare",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

type ProviderSpec = {
  readonly id: ProviderId;
  /** How WE label it in the UI. */
  readonly label: string;
  /** How the BACKEND names it in ModelStats.provider. Deliberately separate from `label`: the
   *  backend says "Ollama" while we display "Ollama Cloud", and collapsing the two silently breaks
   *  the provider filter. `null` for OpenRouter, which is an aggregator - its models carry the
   *  upstream provider's name, which is exactly how we detect them (by absence). */
  readonly backendLabel: string | null;
  /** Model-id prefix, e.g. "groq/llama-3.3-70b". A contract with the backend's resolve_model(). */
  readonly prefix: string;
  /** Compact label for chips and other tight spaces. */
  readonly shortLabel: string;
  /** CSS custom property carrying this provider's brand colour. */
  readonly dotVar: string;
  /** Placeholder shown in the API-keys form. */
  readonly keyHint: string;
  /** True when the provider needs a second credential beyond the API key. */
  readonly needsAccountId: boolean;
};

export const PROVIDERS: Readonly<Record<ProviderId, ProviderSpec>> = {
  groq: { id: "groq", label: "Groq", shortLabel: "Groq", backendLabel: "Groq", prefix: "groq/", dotVar: "var(--color-provider-groq)", keyHint: "gsk_...", needsAccountId: false },
  openrouter: { id: "openrouter", label: "OpenRouter", shortLabel: "OpenRouter", backendLabel: null, prefix: "openrouter/", dotVar: "var(--color-provider-openrouter)", keyHint: "sk-or-v1-...", needsAccountId: false },
  cerebras: { id: "cerebras", label: "Cerebras", shortLabel: "Cerebras", backendLabel: "Cerebras", prefix: "cerebras/", dotVar: "var(--color-provider-cerebras)", keyHint: "csk-...", needsAccountId: false },
  aistudio: { id: "aistudio", label: "Google AI Studio", shortLabel: "AI Studio", backendLabel: "Google AI Studio", prefix: "aistudio/", dotVar: "var(--color-provider-aistudio)", keyHint: "AIza...", needsAccountId: false },
  ollama: { id: "ollama", label: "Ollama Cloud", shortLabel: "Ollama", backendLabel: "Ollama", prefix: "ollama/", dotVar: "var(--color-provider-ollama)", keyHint: "", needsAccountId: false },
  cloudflare: { id: "cloudflare", label: "Cloudflare Workers AI", shortLabel: "Cloudflare", backendLabel: "Cloudflare Workers AI", prefix: "cloudflare/", dotVar: "var(--color-provider-cloudflare)", keyHint: "", needsAccountId: true },
} as const;

/** Backend provider name -> our provider id. Derived, so it cannot drift from PROVIDERS. */
export const PROVIDER_BY_BACKEND_LABEL: Readonly<Record<string, ProviderId>> = Object.fromEntries(
  PROVIDER_IDS.flatMap((id) => {
    const { backendLabel } = PROVIDERS[id];
    return backendLabel ? [[backendLabel, id] as const] : [];
  }),
);

/** The set of providers we route directly. A model whose backend provider is NOT in here reached us
 *  through OpenRouter, which is how the OpenRouter filter identifies its own models. */
export function isDirectlyRoutedProvider(backendProvider: string): boolean {
  return backendProvider in PROVIDER_BY_BACKEND_LABEL;
}

/** OpenRouter is the fallback: an unprefixed model id routes there, exactly as the backend does. */
export const FALLBACK_PROVIDER: ProviderId = "openrouter";

export const PROVIDER_LIST: readonly ProviderSpec[] = PROVIDER_IDS.map((id) => PROVIDERS[id]);

/** Which provider's key a model id needs. Mirrors resolve_model() on the backend. */
export function providerForModel(modelId: string): ProviderId {
  const match = PROVIDER_LIST.find((p) => p.prefix && modelId.startsWith(p.prefix));
  return match?.id ?? FALLBACK_PROVIDER;
}

export function isProviderId(value: string): value is ProviderId {
  return (PROVIDER_IDS as readonly string[]).includes(value);
}
