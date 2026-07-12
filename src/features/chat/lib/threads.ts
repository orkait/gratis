import { PROVIDERS, providerForModel } from "@/config/providers";
import type { ChatThread } from "./chat-db";

/** Thread list logic: search, recency grouping, and the provider a thread's model belongs to.
 *  Pure functions - the panel that renders them stays presentational. */

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_WINDOW_DAYS = 7;

export const THREAD_BUCKETS = ["today", "yesterday", "week", "older"] as const;
export type ThreadBucket = (typeof THREAD_BUCKETS)[number];

const BUCKET_LABEL: Record<ThreadBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Last 7 days",
  older: "Older",
};

export type ThreadGroup = {
  bucket: ThreadBucket;
  label: string;
  threads: ChatThread[];
};

/** Buckets against the local calendar day, not a rolling 24h window: a chat from 11pm last night
 *  reads as "Yesterday", which is what a human means. */
export function bucketFor(updatedAt: number, now: number = Date.now()): ThreadBucket {
  const today = new Date(now);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  if (updatedAt >= startOfToday) return "today";
  if (updatedAt >= startOfToday - DAY_MS) return "yesterday";
  if (updatedAt >= startOfToday - RECENT_WINDOW_DAYS * DAY_MS) return "week";
  return "older";
}

export function filterThreads(threads: readonly ChatThread[], query: string): ChatThread[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...threads];
  return threads.filter(
    (thread) =>
      thread.title.toLowerCase().includes(needle) || thread.modelId.toLowerCase().includes(needle),
  );
}

/** Groups in fixed recency order, empty buckets dropped so the panel never renders a bare heading. */
export function groupThreadsByRecency(threads: readonly ChatThread[]): ThreadGroup[] {
  const byBucket = emptyBuckets();
  for (const thread of threads) byBucket[bucketFor(thread.updatedAt)].push(thread);

  return THREAD_BUCKETS.map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    threads: byBucket[bucket],
  })).filter((group) => group.threads.length > 0);
}

function emptyBuckets(): Record<ThreadBucket, ChatThread[]> {
  const buckets = {} as Record<ThreadBucket, ChatThread[]>;
  for (const bucket of THREAD_BUCKETS) buckets[bucket] = [];
  return buckets;
}

/** A thread stores a model id, not a provider. Resolve it through the one registry that knows the
 *  prefixes, so the sidebar can never disagree with the market about who serves a model. */
export function providerNameForModel(modelId: string): string {
  return PROVIDERS[providerForModel(modelId)].label;
}
