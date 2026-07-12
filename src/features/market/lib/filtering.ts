import { FALLBACK_PROVIDER, PROVIDER_BY_BACKEND_LABEL, isDirectlyRoutedProvider } from "@/config/providers";
import type { Filters } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

const ALL_PROVIDERS = "all";

/** OpenRouter is an aggregator: its models carry the UPSTREAM provider's name (Anthropic, xAI, ...).
 * So "is this an OpenRouter model?" is an absence check - it is anything we do not route directly. */
function matchesProvider(model: ModelStats, wanted: Filters["provider"]): boolean {
  if (wanted === ALL_PROVIDERS) return true;
  if (wanted === FALLBACK_PROVIDER) return !isDirectlyRoutedProvider(model.provider);
  return PROVIDER_BY_BACKEND_LABEL[model.provider] === wanted;
}

/** Every predicate is an early return: the first failure short-circuits, and adding a filter means
 * adding one line rather than editing one long boolean expression. */
export function applyFilters(models: readonly ModelStats[], filters: Filters): ModelStats[] {
  const search = filters.search.trim().toLowerCase();

  return models.filter((model) => {
    if (filters.freeOnly && !model.is_free) return false;
    if (filters.openOnly && !model.open) return false;
    if (filters.brain && !model.brain) return false;
    if (filters.tools && !model.tools) return false;
    if (filters.minParams > 0 && model.params < filters.minParams) return false;
    if (filters.minCtx > 0 && model.ctx < filters.minCtx) return false;
    if (search && !model.id.toLowerCase().includes(search)) return false;
    if (!matchesProvider(model, filters.provider)) return false;
    return true;
  });
}
