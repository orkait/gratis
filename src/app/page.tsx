"use client";
import { useState, useMemo } from "react";
import useSWR from "swr";
import axios from "axios";
import { useStore } from "@/lib/store";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";
import { KpiStrip } from "@/components/app/kpi-strip";
import { ProviderChips } from "@/components/app/provider-chips";
import { ModelTable, applyFilters } from "@/components/app/model-table";
import { DetailDrawer } from "@/components/app/detail-drawer";
import { CommandPalette } from "@/components/app/command-palette";
import { ChatSheet } from "@/components/app/chat-sheet";
import { HelpSheet } from "@/components/app/help-sheet";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const fetcher = async (url: string) => (await axios.get<ModelStats[]>(url)).data;

export default function Page() {
  const { filters, drawerModelId, openDrawer, closeDrawer, closeChat, setCmdk, cmdkOpen, openChat, chatModelId } = useStore();
  const { data: models = [], isLoading } = useSWR(`${API_BASE}/v1/rankings`, fetcher, { revalidateOnFocus: false });
  const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);
  const [helpOpen, setHelpOpen] = useState(false);

  useGlobalHotkeys({
    "cmdk.toggle": () => setCmdk(!cmdkOpen),
    "search.focus": () => {
      const el = document.querySelector<HTMLInputElement>('aside input[placeholder="Model id..."]');
      el?.focus();
    },
    "chat.new": () => {
      if (filtered[0]) openChat(filtered[0].id);
    },
    "drawer.next": () => {
      const idx = drawerModelId ? filtered.findIndex((m) => m.id === drawerModelId) : -1;
      const next = filtered[Math.min(idx + 1, filtered.length - 1)];
      if (next) openDrawer(next.id);
    },
    "drawer.prev": () => {
      const idx = drawerModelId ? filtered.findIndex((m) => m.id === drawerModelId) : 0;
      const prev = filtered[Math.max(idx - 1, 0)];
      if (prev) openDrawer(prev.id);
    },
    "overlay.close": () => {
      if (cmdkOpen) setCmdk(false);
      else if (chatModelId) closeChat();
      else if (drawerModelId) closeDrawer();
      else if (helpOpen) setHelpOpen(false);
    },
    "help.toggle": () => setHelpOpen((v) => !v),
  });

  return (
    <div className="flex min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header count={filtered.length} onHelpClick={() => setHelpOpen(true)} />
        <main className="flex-1 overflow-auto p-6">
          <KpiStrip models={filtered} loading={isLoading} />
          <ProviderChips />
          <ModelTable models={filtered} loading={isLoading} />
        </main>
      </div>
      <DetailDrawer models={models} />
      <CommandPalette models={models} />
      <ChatSheet models={models} />
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
