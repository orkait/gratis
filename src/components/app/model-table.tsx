"use client";
import { useMemo, useCallback, memo } from "react";
import {
  useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel,
  type ColumnDef, type SortingState, type Table as TableApi,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, Brain, Wrench, MessageSquare, BookOpen, Lock, Ghost, ChevronLeft, ChevronRight, Heart, FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { useFiltersStore, LENS_METRIC, type SortCol, type Filters, type PageSize } from "@/lib/stores/filters-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { PROVIDER_LABEL } from "@/lib/types";
import { InfoTip } from "@/components/ui/info-tip";
import { cn } from "@/lib/utils";

export function applyFilters(models: ModelStats[], f: Filters): ModelStats[] {
  return models.filter((m) => {
    if (f.freeOnly && !m.is_free) return false;
    if (f.openOnly && !m.open) return false;
    if (f.brain && !m.brain) return false;
    if (f.tools && !m.tools) return false;
    if (f.minParams > 0 && m.params < f.minParams) return false;
    if (f.minCtx > 0 && m.ctx < f.minCtx) return false;
    if (f.search && !m.id.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.provider !== "all") {
      const expected = f.provider;
      if (expected === "openrouter") {
        if (Object.keys(PROVIDER_LABEL).includes(m.provider)) return false;
      } else {
        if (PROVIDER_LABEL[m.provider] !== expected) return false;
      }
    }
    return true;
  });
}

export function scoreOf(m: ModelStats, key: string): number | undefined {
  const v = m.scores ? (m.scores as Record<string, number>)[key] : undefined;
  return v == null ? undefined : v;
}

// Comparable value for one column. Returns `undefined` (never null) for a missing dimension so
// TanStack's `sortUndefined: "last"` can push blanks to the bottom in both sort directions.
export function sortValue(m: ModelStats, col: SortCol): number | string | undefined {
  if (col === "is_free") return m.is_free ? 1 : 0;
  if (col === "caps") return (m.brain ? 4 : 0) + (m.tools ? 2 : 0) + (m.open ? 1 : 0);
  if (col === "id") return m.id;
  const s = scoreOf(m, col);
  if (s !== undefined) return s;
  const raw = (m as unknown as Record<string, number | string | null | undefined>)[col];
  return raw == null ? undefined : raw;
}

// Data-driven sortable column universe consumed by the TanStack engine. Cells are rendered by hand
// (below) - these defs exist purely so the engine knows how to sort each key. `id`/`is_free`/`caps`
// lead; the dynamic score dimensions follow in caller order, deduped.
export function buildColumns(scoreKeys: string[]): ColumnDef<ModelStats>[] {
  const numeric = (id: string): ColumnDef<ModelStats> => ({
    id,
    accessorFn: (m) => sortValue(m, id),
    sortingFn: "basic",
    sortUndefined: "last",
  });
  const seen = new Set(["id", "is_free", "caps"]);
  const scoreCols: ColumnDef<ModelStats>[] = [];
  for (const k of scoreKeys) {
    if (seen.has(k)) continue;
    seen.add(k);
    scoreCols.push(numeric(k));
  }
  return [
    { id: "id", accessorFn: (m) => m.id, sortingFn: "text" },
    numeric("is_free"),
    numeric("caps"),
    ...scoreCols,
  ];
}

function priceLabel(m: ModelStats): string | null {
  if (m.is_free) return "free";
  if (!m.price_out) return null;
  return `$${(m.price_out * 1_000_000).toFixed(m.price_out * 1e6 >= 1 ? 1 : 2)}/M`;
}

const SCORE_ORDER = [
  "overall", "intelligence", "coding", "reasoning", "math", "tool_use", "knowledge", "instruction",
  "speed", "value", "affordability", "context", "reliability",
  "fit_chat", "fit_code", "fit_math", "fit_agent", "fit_budget", "fit_fast",
];
const SCORE_LABEL: Record<string, string> = {
  overall: "Overall", intelligence: "Intel", tool_use: "Tools", affordability: "Cheap",
  reliability: "Uptime", instruction: "Instruct", knowledge: "Know",
  fit_chat: "Chat", fit_code: "Code", fit_math: "Math",
  fit_agent: "Agent", fit_budget: "Budget", fit_fast: "Fast",
};

function deriveScoreKeys(models: ModelStats[]): string[] {
  const seen = new Set<string>();
  for (const m of models) if (m.scores) for (const k of Object.keys(m.scores)) seen.add(k);
  const ordered = SCORE_ORDER.filter((k) => seen.has(k));
  const extra = [...seen].filter((k) => !SCORE_ORDER.includes(k)).sort();
  return [...ordered, ...extra];
}

function labelFor(key: string): string {
  return SCORE_LABEL[key] ?? key.replace(/^fit_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── shared bits ──────────────────────────────────────────────────────────────────────────────────
function Bar({ v, tone = "accent" }: { v?: number | null; tone?: "accent" | "muted" | "human" }) {
  const w = v == null ? 0 : Math.max(2, Math.min(100, v));
  const color = tone === "human" ? "bg-(--color-success)" : tone === "muted" ? "bg-(--color-fg-subtle)/70" : "bg-(--color-accent)";
  return (
    <div className="h-2 w-full rounded-full bg-(--color-surface-3) overflow-hidden">
      <div className={cn("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${w}%` }} />
    </div>
  );
}

const CONF_DOT: Record<string, string> = {
  high: "bg-(--color-success)", medium: "bg-(--color-fg-subtle)/60", low: "bg-(--color-warning)",
};

function ModelCell({ m, showHonesty }: { m: ModelStats; showHonesty: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-md bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center text-[10px] font-mono font-semibold text-(--color-fg-muted) shrink-0">
        {m.params >= 1 ? formatParams(m.params) : "?"}
      </div>
      <div className="min-w-0">
        <div className="text-[13px] font-medium truncate flex items-center gap-2">
          {m.confidence && showHonesty && (
            <InfoTip content={`${m.confidence} confidence, from benchmark coverage + cross-benchmark agreement`}>
              <span className={cn("inline-block w-1.5 h-1.5 rounded-full shrink-0", CONF_DOT[m.confidence])} />
            </InfoTip>
          )}
          <span className="truncate">{displayName(m.id)}</span>
          {m.archetype && <span className="text-[9px] uppercase tracking-wide font-mono px-1.5 py-px rounded bg-(--color-surface-2) text-(--color-fg-subtle) shrink-0">{m.archetype}</span>}
          {showHonesty && m.divergence === "human-favored" && (
            <InfoTip content={`Humans rate this above its benchmarks (Elo ${m.arena_elo}). Trust the crowd for chat.`}>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-px rounded bg-(--color-success)/15 text-(--color-success) shrink-0"><Heart className="w-2.5 h-2.5" />humans</span>
            </InfoTip>
          )}
          {showHonesty && m.divergence === "bench-favored" && (
            <InfoTip content={`Benchmarks rate this above human preference (Elo ${m.arena_elo}). Great scores, humans less sold.`}>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono px-1.5 py-px rounded bg-(--color-warning)/15 text-(--color-warning) shrink-0"><FlaskConical className="w-2.5 h-2.5" />benches</span>
            </InfoTip>
          )}
        </div>
        <div className="text-[11px] text-(--color-fg-subtle) flex items-center gap-1.5">
          <ProviderAvatar provider={m.provider} size="xs" />
          {m.provider}
          {showHonesty && m.bench_count != null && m.bench_count > 0 && (
            <InfoTip content={`Grounded in ${m.bench_count} community benchmarks${m.consensus != null ? `, ${m.consensus.toFixed(0)}% cross-benchmark agreement (low agreement = a contested score)` : ""}`}>
              <span className="text-[10px] font-mono text-(--color-fg-subtle)/70">· {m.bench_count} benches{m.consensus != null && `, ${m.consensus.toFixed(0)}% agree`}</span>
            </InfoTip>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DECISION VIEW - the pick + why to trust it ─────────────────────────────────────────────────────
const SIGNALS: { key: string; label: string }[] = [
  { key: "intelligence", label: "Intel" }, { key: "coding", label: "Code" },
  { key: "tool_use", label: "Tools" }, { key: "speed", label: "Fast" },
];

// Memoized so a drawer-open (which flips `active` on 2 rows) re-renders only those 2 rows, not all 50.
// Without this the whole tooltip-heavy body re-rendered on every click (~200ms/click, UI froze).
// Handlers must be stable: `onOpen`/`onChat` are stable refs from the parent (zustand actions + useCallback).
const DecisionRow = memo(function DecisionRow(
  { m, rank, active, metricKey, onOpen, onChat }:
  { m: ModelStats; rank: number; active: boolean; metricKey: string; onOpen: (id: string) => void; onChat: (id: string) => void },
) {
  const hv = scoreOf(m, metricKey);
  return (
    <TR role="button" tabIndex={0} aria-label={`Details for ${m.id}`}
      onClick={() => onOpen(m.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(m.id); } }}
      className={cn("cursor-pointer", active && "bg-(--color-accent-soft) border-l-2 border-l-(--color-accent)")}>
      <TD className="text-right pr-3 font-mono text-[11px] text-(--color-fg-subtle) tabular-nums">{rank}</TD>
      <TD><ModelCell m={m} showHonesty /></TD>
      <TD>
        <div className="flex items-center gap-2">
          <span className="text-[18px] leading-none font-semibold tabular-nums text-(--color-accent) w-8 text-right">{hv == null ? "-" : hv.toFixed(0)}</span>
          <div className="flex-1"><Bar v={hv} /></div>
        </div>
      </TD>
      <TD>
        <div className="flex gap-3">
          {SIGNALS.map((s) => {
            const v = scoreOf(m, s.key);
            return (
              <div key={s.key} className="w-14">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] font-mono uppercase tracking-wide text-(--color-fg-subtle)/70">{s.label}</span>
                  <span className="text-[9px] font-mono tabular-nums text-(--color-fg-muted)">{v == null ? "-" : v.toFixed(0)}</span>
                </div>
                <Bar v={v} tone="muted" />
              </div>
            );
          })}
        </div>
      </TD>
      <TD>
        {m.preference != null ? (
          <div className="space-y-1 w-24">
            <div className="flex items-center gap-1.5"><span className="text-[8px] font-mono w-2.5 text-(--color-fg-subtle)">B</span><Bar v={m.scores?.overall} tone="accent" /></div>
            <div className="flex items-center gap-1.5"><span className="text-[8px] font-mono w-2.5 text-(--color-fg-subtle)">H</span><Bar v={m.preference} tone="human" /></div>
          </div>
        ) : <span className="text-[10px] font-mono text-(--color-fg-subtle)/50">no votes</span>}
      </TD>
      <TD className="text-right">
        <span className={cn("text-[11px] font-mono tabular-nums", m.is_free ? "text-(--color-success)" : "text-(--color-fg-muted)")}>{priceLabel(m) ?? "-"}</span>
      </TD>
      <TD className="text-center">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onChat(m.id); }} aria-label="Open chat">
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
      </TD>
    </TR>
  );
});

function DecisionRows({ rows, start, metricKey }: { rows: ModelStats[]; start: number; metricKey: string }) {
  const { openDrawer, drawerModelId } = useUIStore();
  const { startNewChat } = useChatSessionStore();
  const router = useRouter();
  const onChat = useCallback((id: string) => { startNewChat(id); router.push("/"); }, [startNewChat, router]);
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH className="w-10 text-right pr-3 font-mono text-[10px]">#</TH>
          <TH>Model</TH>
          <TH className="w-36">{labelFor(metricKey)}</TH>
          <TH className="w-[280px]">Signals</TH>
          <TH className="w-28" title="Benchmark composite (B) vs human-preference Elo (H)">Bench · Human</TH>
          <TH className="w-16 text-right">Cost</TH>
          <TH className="w-12" />
        </TR>
      </THead>
      <TBody>
        {rows.map((m, i) => (
          <DecisionRow key={m.id} m={m} rank={start + i + 1} active={drawerModelId === m.id} metricKey={metricKey} onOpen={openDrawer} onChat={onChat} />
        ))}
      </TBody>
    </Table>
  );
}

// ── AUDIT VIEW - every dimension, data-driven columns ──────────────────────────────────────────────
const AuditRow = memo(function AuditRow(
  { m, rank, active, scoreKeys, onOpen, onChat }:
  { m: ModelStats; rank: number; active: boolean; scoreKeys: string[]; onOpen: (id: string) => void; onChat: (id: string) => void },
) {
  return (
    <TR role="button" tabIndex={0} aria-label={`Details for ${m.id}`}
      onClick={() => onOpen(m.id)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(m.id); } }}
      className={cn("cursor-pointer", active && "bg-(--color-accent-soft) border-l-2 border-l-(--color-accent)")}>
      <TD className="text-right pr-4 font-mono text-[11px] text-(--color-fg-subtle)">{rank}</TD>
      <TD><ModelCell m={m} showHonesty /></TD>
      <TD>
        <div className="flex flex-col gap-0.5">
          {m.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>}
          {!m.is_free && priceLabel(m) && <span className="text-[10px] font-mono text-(--color-fg-subtle) tabular-nums">{priceLabel(m)}</span>}
        </div>
      </TD>
      <TD>
        <div className="flex items-center gap-1.5">
          {m.brain && <Badge variant="accent"><Brain className="w-2.5 h-2.5" />IQ</Badge>}
          {m.tools && <Badge variant="info"><Wrench className="w-2.5 h-2.5" />TOOL</Badge>}
          {m.open ? <BookOpen className="w-3 h-3 text-(--color-fg-subtle)" /> : <Lock className="w-3 h-3 text-(--color-fg-subtle)/40" />}
        </div>
      </TD>
      {scoreKeys.map((k) => {
        const v = scoreOf(m, k);
        return (
          <TD key={k} className={cn("text-right font-mono text-[12px] tabular-nums",
            k === "overall" ? "text-(--color-accent) font-semibold text-[13px]" : "text-(--color-fg-muted)")}>
            {v == null ? <span className="text-(--color-fg-disabled)">-</span> : v.toFixed(0)}
          </TD>
        );
      })}
      <TD className="text-center">
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onChat(m.id); }} aria-label="Open chat">
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
      </TD>
    </TR>
  );
});

function DetailedTable({ rows, start, models, table }: { rows: ModelStats[]; start: number; models: ModelStats[]; table: TableApi<ModelStats> }) {
  const { openDrawer, drawerModelId } = useUIStore();
  const { startNewChat } = useChatSessionStore();
  const router = useRouter();
  const scoreKeys = useMemo(() => deriveScoreKeys(models), [models]);
  const onChat = useCallback((id: string) => { startNewChat(id); router.push("/"); }, [startNewChat, router]);
  return (
    <Table>
      <THead>
        <TR className="hover:bg-transparent">
          <TH className="w-12 text-right pr-4 font-mono text-[10px]">#</TH>
          <SortHead table={table} col="id" label="Model" />
          <SortHead table={table} col="is_free" label="Tier" />
          <SortHead table={table} col="caps" label="Caps" />
          {scoreKeys.map((k) => (
            <SortHead key={k} table={table} col={k} label={labelFor(k)} align="right" highlighted={k === "overall"} />
          ))}
          <TH className="w-20 text-center">Action</TH>
        </TR>
      </THead>
      <TBody>
        {rows.map((m, i) => (
          <AuditRow key={m.id} m={m} rank={start + i + 1} active={drawerModelId === m.id} scoreKeys={scoreKeys} onOpen={openDrawer} onChat={onChat} />
        ))}
      </TBody>
    </Table>
  );
}

export function ModelTable({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  const { sort, lens, view, page, pageSize, setPage, setPageSize, setSortRaw } = useFiltersStore();

  const columns = useMemo(() => {
    const universe = Array.from(new Set(["overall", ...Object.values(LENS_METRIC), ...deriveScoreKeys(models)]));
    return buildColumns(universe);
  }, [models]);

  const metricKey = LENS_METRIC[lens];
  const total = models.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  // Stable refs: passing fresh array/object literals as controlled state every render makes TanStack
  // recompute row models and re-run reset logic each render - a churn source. Memoize them.
  const sorting = useMemo<SortingState>(
    () => (view === "decision" ? [{ id: metricKey, desc: true }] : [{ id: sort.col, desc: sort.desc }]),
    [view, metricKey, sort.col, sort.desc],
  );
  const pagination = useMemo(() => ({ pageIndex: currentPage - 1, pageSize }), [currentPage, pageSize]);

  const table = useReactTable({
    data: models,
    columns,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      if (view === "decision") return; // metric sort is derived, never persisted
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const s = next[0];
      if (s) setSortRaw({ col: s.id, desc: s.desc });
    },
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater(pagination) : updater;
      if (next.pageSize !== pageSize) setPageSize(next.pageSize as PageSize);
      else setPage(next.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableSortingRemoval: false,
    sortDescFirst: true,
    // Pagination + sorting are fully store-controlled. Never let TanStack auto-reset page index on data
    // change - that fires onPaginationChange -> setPage -> re-render -> ... a main-thread churn loop.
    autoResetPageIndex: false,
    autoResetAll: false,
  });

  if (loading) {
    return <div className="space-y-1">{[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>;
  }

  if (total === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-(--color-fg-subtle) gap-3">
        <Ghost className="w-8 h-8" />
        <div className="text-center">
          <div className="text-[14px] font-medium text-(--color-fg-muted)">No models match your filters</div>
          <div className="text-[12px] mt-1">Try resetting filters in the sidebar</div>
        </div>
      </div>
    );
  }

  const pageRows = table.getRowModel().rows.map((r) => r.original);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageRows.length, total);

  return (
    <div className="rounded-lg border border-(--color-border) overflow-hidden bg-(--color-surface-1)">
      <div className="overflow-x-auto">
        {view === "decision"
          ? <DecisionRows rows={pageRows} start={start} metricKey={metricKey} />
          : <DetailedTable rows={pageRows} start={start} models={models} table={table} />}
      </div>
      <Pagination start={start} end={end} total={total} page={currentPage} totalPages={totalPages} pageSize={pageSize} onPage={setPage} onSize={setPageSize} />
    </div>
  );
}

function Pagination({ start, end, total, page, totalPages, pageSize, onPage, onSize }: {
  start: number; end: number; total: number; page: number; totalPages: number; pageSize: PageSize;
  onPage: (p: number) => void; onSize: (s: PageSize) => void;
}) {
  return (
    <div className="h-12 px-4 border-t border-(--color-border) flex items-center justify-between gap-4 bg-(--color-bg)">
      <div className="text-[11px] font-mono text-(--color-fg-subtle) tabular-nums">{start + 1}-{end} of {total}</div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-(--color-fg-subtle)">Rows</span>
          {([50, 100, 200] as PageSize[]).map((s) => (
            <button key={s} type="button" onClick={() => onSize(s)}
              className={cn("h-6 px-2 rounded text-[11px] font-mono cursor-pointer transition-colors duration-[120ms]",
                pageSize === s ? "bg-(--color-accent-soft) text-(--color-accent)" : "text-(--color-fg-muted) hover:bg-(--color-surface-2)")}>
              {s}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-(--color-border)" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="w-3.5 h-3.5" /></Button>
          <span className="text-[11px] font-mono tabular-nums text-(--color-fg-muted) min-w-[60px] text-center">{page} / {totalPages}</span>
          <Button variant="ghost" size="icon" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page"><ChevronRight className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

function SortHead({ table, col, label, align = "left", highlighted = false }: { table: TableApi<ModelStats>; col: SortCol; label: string; align?: "left" | "right"; highlighted?: boolean }) {
  const column = table.getColumn(col);
  const dir = column?.getIsSorted(); // "asc" | "desc" | false
  return (
    <TH className={cn("cursor-pointer select-none hover:text-(--color-fg)", align === "right" && "text-right", highlighted && "bg-(--color-accent-soft)")} onClick={column?.getToggleSortingHandler()}>
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {dir === "desc" ? <ChevronDown className="w-3 h-3 text-(--color-accent)" /> : dir === "asc" ? <ChevronUp className="w-3 h-3 text-(--color-accent)" /> : null}
      </span>
    </TH>
  );
}

function formatParams(b: number): string {
  if (b >= 1000) return `${(b / 1000).toFixed(b % 1000 === 0 ? 0 : 1)}T`;
  return `${b}B`;
}

/** Strip provider-path noise for display: "cloudflare/@cf/zai-org/glm-5.2" -> "glm-5.2".
 * The provider is already shown as an avatar + name on the row's second line. */
function displayName(id: string): string {
  const seg = id.split("/").filter(Boolean).pop();
  return (seg || id).replace(/^@/, "");
}
