"use client";
import { PlugZap, RotateCw } from "lucide-react";

/** Shown when the market cannot be fetched at all.
 *
 * Distinct from the empty-filter state on purpose. An unreachable backend and an over-narrow filter
 * both yield zero rows, and conflating them sends people to reset filters that were never the problem.
 */
export function MarketError({ onRetry, message }: { onRetry: () => void; message?: string }) {
  return (
    <div
      role="alert"
      className="h-[400px] flex flex-col items-center justify-center gap-3 text-(--color-fg-subtle)"
    >
      <PlugZap className="w-8 h-8" />
      <div className="text-center">
        <div className="text-[14px] font-medium text-(--color-fg-muted)">Can&apos;t reach the backend</div>
        <div className="text-[12px] mt-1">
          The model market lives on the API server. Start it with{" "}
          <code className="font-mono text-(--color-fg-muted)">python dev.py</code>, then retry.
        </div>
        {message ? (
          <div className="text-[11px] font-mono mt-2 text-(--color-fg-subtle) opacity-80">{message}</div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-(--color-border) px-3 py-1.5 text-[12px] text-(--color-fg-muted) hover:bg-(--color-surface-2) transition-colors"
      >
        <RotateCw className="w-3.5 h-3.5" />
        Retry
      </button>
    </div>
  );
}
