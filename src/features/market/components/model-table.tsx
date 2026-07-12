"use client";
import { Ghost } from "lucide-react";
import type { Table as TableApi } from "@tanstack/react-table";
import { Table, THead, TBody, TR, TH } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUIStore } from "@/stores/ui-store";
import type { ModelStats } from "@/types/model";
import { labelFor } from "../lib/scores";
import { useModelTable } from "../hooks/use-model-table";
import { useOpenChat } from "../hooks/use-open-chat";
import { DecisionRow } from "./decision-row";
import { AuditRow } from "./audit-row";
import { SortHead } from "./sort-head";
import { TablePagination } from "./table-pagination";

// Re-exported: the market page and the existing tests import applyFilters from here.
export { applyFilters } from "../lib/filtering";

const SKELETON_ROWS = 8;

export function ModelTable({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  const view = useModelTable(models);

  if (loading) return <TableSkeleton />;
  if (view.total === 0) return <EmptyFilters />;

  return (
    <div className="rounded-lg border border-(--color-border) overflow-hidden bg-(--color-surface-1)">
      <div className="overflow-x-auto">
        {view.isDecisionView ? (
          <DecisionTable rows={view.pageRows} start={view.start} metricKey={view.metricKey} />
        ) : (
          <AuditTable rows={view.pageRows} start={view.start} scoreKeys={view.scoreKeys} table={view.table} />
        )}
      </div>

      <TablePagination
        start={view.start}
        end={view.end}
        total={view.total}
        page={view.page}
        totalPages={view.totalPages}
        pageSize={view.pageSize}
        onPage={view.setPage}
        onSize={view.setPageSize}
      />
    </div>
  );
}

function DecisionTable({ rows, start, metricKey }: { rows: ModelStats[]; start: number; metricKey: string }) {
  const openDrawer = useUIStore((s) => s.openDrawer);
  const drawerModelId = useUIStore((s) => s.drawerModelId);
  const openChat = useOpenChat();

  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH className="w-10 text-right pr-3 font-mono text-xs">#</TH>
          <TH>Model</TH>
          <TH className="w-36">{labelFor(metricKey)}</TH>
          <TH className="w-[280px]">Signals</TH>
          <TH className="w-28" title="Benchmark composite (B) vs human-preference Elo (H)">
            Bench · Human
          </TH>
          <TH className="w-16 text-right">Cost</TH>
          <TH className="w-12" />
        </TR>
      </THead>
      <TBody>
        {rows.map((model, index) => (
          <DecisionRow
            key={model.id}
            model={model}
            rank={start + index + 1}
            active={drawerModelId === model.id}
            metricKey={metricKey}
            onOpen={openDrawer}
            onChat={openChat}
          />
        ))}
      </TBody>
    </Table>
  );
}

function AuditTable({
  rows,
  start,
  scoreKeys,
  table,
}: {
  rows: ModelStats[];
  start: number;
  scoreKeys: string[];
  table: TableApi<ModelStats>;
}) {
  const openDrawer = useUIStore((s) => s.openDrawer);
  const drawerModelId = useUIStore((s) => s.drawerModelId);
  const openChat = useOpenChat();

  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH className="w-12 text-right pr-4 font-mono text-xs">#</TH>
          <SortHead table={table} col="id" label="Model" />
          <SortHead table={table} col="is_free" label="Tier" />
          <SortHead table={table} col="caps" label="Caps" />
          {scoreKeys.map((key) => (
            <SortHead
              key={key}
              table={table}
              col={key}
              label={labelFor(key)}
              align="right"
              highlighted={key === "overall"}
            />
          ))}
          <TH className="w-20 text-center">Action</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((model, index) => (
          <AuditRow
            key={model.id}
            model={model}
            rank={start + index + 1}
            active={drawerModelId === model.id}
            scoreKeys={scoreKeys}
            onOpen={openDrawer}
            onChat={openChat}
          />
        ))}
      </TBody>
    </Table>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <Skeleton key={index} className="h-10" />
      ))}
    </div>
  );
}

function EmptyFilters() {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center text-(--color-fg-subtle) gap-3">
      <Ghost className="w-8 h-8" />
      <div className="text-center">
        <div className="text-base font-medium text-(--color-fg-muted)">No models match your filters</div>
        <div className="text-sm mt-1">Try resetting filters in the sidebar</div>
      </div>
    </div>
  );
}
