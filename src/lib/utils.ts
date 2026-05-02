import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number, digits = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(digits)}K`;
  return n.toFixed(digits);
}
