/** Model-id constants that are part of the public API contract. */

/** "Pick the best free model for me". */
export const POOL_MODEL_ID = "gratis-auto";

/** The pre-Gratis name. Still accepted by the backend and still present in persisted client state,
 *  so it must keep resolving. Never remove. */
export const LEGACY_POOL_MODEL_ID = "zero-cost-intelligent";

export const POOL_MODEL_IDS = [POOL_MODEL_ID, LEGACY_POOL_MODEL_ID] as const;

export function isPoolModel(modelId: string): boolean {
  return (POOL_MODEL_IDS as readonly string[]).includes(modelId);
}
