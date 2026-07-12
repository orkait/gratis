"use client";
import { useCallback, useMemo, useState } from "react";
import { useFiltersStore } from "@/stores/filters-store";
import { useUIStore } from "@/stores/ui-store";
import { useRankings } from "@/features/market/api-rankings";
import { AppShell, ShellStatus } from "@/features/shell/components/app-shell";
import { CommandPalette } from "@/features/shell/components/command-palette";
import { HelpSheet } from "@/features/shell/components/help-sheet";
import { MarketFilters } from "@/features/market/components/market-filters";
import { KpiStrip } from "@/features/market/components/kpi-strip";
import { ProviderChips } from "@/features/market/components/provider-chips";
import { TaskLens } from "@/features/market/components/task-lens";
import { ModelTable, applyFilters } from "@/features/market/components/model-table";
import { MarketError } from "@/features/market/components/market-error";
import { DetailDrawer } from "@/features/market/components/detail-drawer";
import { useMarketHotkeys } from "@/features/market/hooks/use-market-hotkeys";

export default function MarketPage() {
  const { filters } = useFiltersStore();
  const { drawerModelId } = useUIStore();
  const { data: models = [], isLoading, isError, error, refetch } = useRankings();
  const [helpOpen, setHelpOpen] = useState(false);

  const filtered = useMemo(() => applyFilters(models, filters), [models, filters]);

  useMarketHotkeys({ filtered, drawerModelId, helpOpen, setHelpOpen });

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const retry = useCallback(() => void refetch(), [refetch]);

  const errorMessage = error instanceof Error ? error.message : undefined;

  return (
    <AppShell
      title="Market"
      meta={`${filtered.length} models`}
      panel={<MarketFilters />}
      actions={<ShellStatus onHelpClick={openHelp} />}
    >
      {isError ? (
        // Replaces the whole surface: KPI cards reading "0 models / 0 providers" beside an error
        // message would be their own small lie.
        <MarketError onRetry={retry} message={errorMessage} />
      ) : (
        <MarketContent models={filtered} loading={isLoading} />
      )}

      <DetailDrawer models={models} />
      <CommandPalette models={models} />
      <HelpSheet open={helpOpen} onClose={closeHelp} />
    </AppShell>
  );
}

function MarketContent({ models, loading }: { models: ModelStatsList; loading: boolean }) {
  return (
    <>
      <KpiStrip models={models} loading={loading} />
      <ProviderChips />
      <TaskLens />
      <ModelTable models={models} loading={loading} />
    </>
  );
}

type ModelStatsList = Parameters<typeof KpiStrip>[0]["models"];
