"use client";
import { useCallback, useMemo } from "react";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type OnChangeFn,
  type PaginationState,
  type SortingState,
  type Table as TableApi,
} from "@tanstack/react-table";
import { useFiltersStore, LENS_METRIC, type PageSize } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";
import { buildColumns } from "../lib/columns";
import { deriveScoreKeys } from "../lib/scores";

const DECISION_VIEW = "decision";

export type ModelTableModel = {
  table: TableApi<ModelStats>;
  pageRows: ModelStats[];
  scoreKeys: string[];
  metricKey: string;
  isDecisionView: boolean;
  start: number;
  end: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  setPage: (page: number) => void;
  setPageSize: (size: PageSize) => void;
};

/** Owns the TanStack engine and every derived index. The component is left to render.
 *
 * Two invariants are load-bearing and were paid for in a real freeze:
 *  - `sorting`/`pagination` must be memoized. Passing fresh literals as controlled state makes
 *    TanStack recompute row models and re-run reset logic on every render.
 *  - `autoResetPageIndex` must stay off. Pagination is fully store-controlled, and an auto-reset
 *    fires onPaginationChange -> setPage -> re-render -> ... a main-thread churn loop.
 */
export function useModelTable(models: ModelStats[]): ModelTableModel {
  const { sort, lens, view, page, pageSize, setPage, setPageSize, setSortRaw } = useFiltersStore();

  const scoreKeys = useMemo(() => deriveScoreKeys(models), [models]);
  const columns = useMemo(() => buildColumns(scoreKeys), [scoreKeys]);

  const metricKey = LENS_METRIC[lens];
  const isDecisionView = view === DECISION_VIEW;

  const total = models.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  // ONE source of truth for sort, in both views. The decision view used to hard-code
  // [{ id: metricKey }] and throw away onSortingChange, so clicking a header was a silent no-op.
  // Picking a lens still sets the sort (setLens writes sort = LENS_METRIC[lens]); the difference is
  // that the user can now override it, and switching lens puts it back.
  const sorting = useMemo<SortingState>(
    () => [{ id: sort.col, desc: sort.desc }],
    [sort.col, sort.desc],
  );

  const pagination = useMemo<PaginationState>(
    () => ({ pageIndex: currentPage - 1, pageSize }),
    [currentPage, pageSize],
  );

  const onSortingChange = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      if (first) setSortRaw({ col: first.id, desc: first.desc });
    },
    [sorting, setSortRaw],
  );

  const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize as PageSize);
        return;
      }
      setPage(next.pageIndex + 1);
    },
    [pagination, pageSize, setPageSize, setPage],
  );

  const table = useReactTable({
    data: models,
    columns,
    state: { sorting, pagination },
    onSortingChange,
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    sortDescFirst: true,
    autoResetPageIndex: false,
    autoResetAll: false,
  });

  const pageRows = table.getRowModel().rows.map((row) => row.original);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageRows.length, total);

  return {
    table,
    pageRows,
    scoreKeys,
    metricKey,
    isDecisionView,
    start,
    end,
    total,
    page: currentPage,
    totalPages,
    pageSize,
    setPage,
    setPageSize,
  };
}
