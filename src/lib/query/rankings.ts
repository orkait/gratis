"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const rankingsKey = ["rankings"] as const;

async function fetchRankings(): Promise<ModelStats[]> {
  const { data } = await axios.get<ModelStats[]>(`${API_BASE}/v1/rankings`);
  return data;
}

// Backend already TTL-caches the assembled market (30 min). Mirror that on the client so remounts /
// tab focus don't refetch within the window. Env override: NEXT_PUBLIC_RANKINGS_STALE_MS.
const RANKINGS_STALE_MS = Number(process.env.NEXT_PUBLIC_RANKINGS_STALE_MS ?? 30 * 60 * 1000);

/** Model market rankings from /v1/rankings. Cached + deduped across pages by React Query. */
export function useRankings() {
  return useQuery({
    queryKey: rankingsKey,
    queryFn: fetchRankings,
    staleTime: RANKINGS_STALE_MS,
    gcTime: RANKINGS_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
