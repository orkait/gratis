"use client";
import useSWR from "swr";
import axios from "axios";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";
import { KpiStrip } from "@/components/app/kpi-strip";
import { ProviderChips } from "@/components/app/provider-chips";
import { ModelTable, applyFilters } from "@/components/app/model-table";
import { DetailDrawer } from "@/components/app/detail-drawer";
import { CommandPalette } from "@/components/app/command-palette";
import { ChatSheet } from "@/components/app/chat-sheet";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const fetcher = async (url: string) => (await axios.get<ModelStats[]>(url)).data;

export default function Page() {
  const { filters } = useStore();
  const { data: models = [], isLoading } = useSWR(`${API_BASE}/v1/rankings`, fetcher, { revalidateOnFocus: false });
  const filtered = applyFilters(models, filters);

  return (
    <div className="flex min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header count={filtered.length} />
        <main className="flex-1 overflow-auto p-6">
          <KpiStrip models={filtered} loading={isLoading} />
          <ProviderChips />
          <ModelTable models={filtered} loading={isLoading} />
        </main>
      </div>
      <DetailDrawer models={models} />
      <CommandPalette models={models} />
      <ChatSheet />
    </div>
  );
}
