const BILLIONS_PER_TRILLION = 1000;

export function formatParams(billions: number): string {
  if (billions < BILLIONS_PER_TRILLION) return `${billions}B`;
  const trillions = billions / BILLIONS_PER_TRILLION;
  const precision = billions % BILLIONS_PER_TRILLION === 0 ? 0 : 1;
  return `${trillions.toFixed(precision)}T`;
}

/** Strip provider-path noise for display: "cloudflare/@cf/zai-org/glm-5.2" -> "glm-5.2".
 * The provider is already shown as an avatar + name on the row's second line. */
export function displayName(modelId: string): string {
  const last = modelId.split("/").filter(Boolean).pop();
  return (last ?? modelId).replace(/^@/, "");
}
