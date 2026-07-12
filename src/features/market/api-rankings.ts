"use client";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL, BACKEND_ENDPOINTS, RANKINGS_STALE_MS } from "@/config/api";
import type { ModelStats } from "@/types/model";

export const RANKINGS_KEY = ["rankings"] as const;

async function fetchRankings(): Promise<ModelStats[]> {
  const { data } = await axios.get<ModelStats[]>(`${API_BASE_URL}${BACKEND_ENDPOINTS.rankings}`);
  return data;
}

/** The model market. The backend already TTL-caches the assembled market, so this mirrors that
 * window on the client: remounts and tab focus do not refetch inside it. */
export function useRankings(): UseQueryResult<ModelStats[], Error> {
  return useQuery({
    queryKey: RANKINGS_KEY,
    queryFn: fetchRankings,
    staleTime: RANKINGS_STALE_MS,
    gcTime: RANKINGS_STALE_MS,
    refetchOnWindowFocus: false,
  });
}
