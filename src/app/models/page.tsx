"use client";
import { useState, useMemo } from "react";
import { useFiltersStore } from "@/lib/stores/filters-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useRankings } from "@/lib/query/rankings";
import { useGlobalHotkeys } from "@/lib/use-global-hotkeys";
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";
import { KpiStrip } from "@/components/app/kpi-strip";
import { ProviderChips } from "@/components/app/provider-chips";
import { ModelTable, applyFilters } from "@/components/app/model-table";
import { DetailDrawer } from "@/components/app/detail-drawer";
import { CommandPalette } from "@/components/app/command-palette";
import { HelpSheet } from "@/components/app/help-sheet";

export default function ModelsPage() {
  const { filters } = useFiltersStore();
  const { drawerModelId, openDrawer, closeDrawer, setCmdk, cmdkOpen } = useUIStore();
  const { data: models = [], isLoading } = useRankings();
  const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);
  const [helpOpen, setHelpOpen] = useState(false);

  useGlobalHotkeys({
    "cmdk.toggle": () => setCmdk(!cmdkOpen),
    "search.focus": () => {
      const el = document.querySelector<HTMLInputElement>('aside input[placeholder="Model id..."]');
      el?.focus();
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
      <HelpSheet open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
