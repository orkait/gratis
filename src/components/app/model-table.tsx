"use client";
import { ChevronUp, ChevronDown, Brain, Wrench, MessageSquare, BookOpen, Lock, Ghost, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ProviderAvatar } from "@/components/ui/provider-avatar";
import { useFiltersStore, type SortCol, type Filters, type PageSize } from "@/lib/stores/filters-store";
import { useUIStore } from "@/lib/stores/ui-store";
import { useChatSessionStore } from "@/lib/stores/chat-session-store";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { PROVIDER_LABEL } from "@/lib/types";
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

function sortValue(m: ModelStats, col: SortCol): number | string | null {
  if (col === "is_free") return m.is_free ? 1 : 0;
  if (col === "caps") return (m.brain ? 4 : 0) + (m.tools ? 2 : 0) + (m.open ? 1 : 0);
  return m[col] as number | string | null;
}

export function ModelTable({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  const { sort, page, pageSize, setPage, setPageSize } = useFiltersStore();
  const { openDrawer, drawerModelId } = useUIStore();
  const { startNewChat } = useChatSessionStore();
  const router = useRouter();

  if (loading) {
    return (
      <div className="space-y-1">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  const sorted = [...models].sort((a, b) => {
    const av = sortValue(a, sort.col); const bv = sortValue(b, sort.col);
    if (av == null && bv == null) return 0;
    if (av == null) return sort.desc ? 1 : -1;
    if (bv == null) return sort.desc ? -1 : 1;
    if (typeof av === "string" && typeof bv === "string") return sort.desc ? bv.localeCompare(av) : av.localeCompare(bv);
    return sort.desc ? Number(bv) - Number(av) : Number(av) - Number(bv);
  });

  if (sorted.length === 0) {
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

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(start + pageSize, total);
  const pageRows = sorted.slice(start, end);

  return (
    <div className="rounded-lg border border-(--color-border) overflow-hidden bg-(--color-surface-1)">
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH className="w-12 text-right pr-4 font-mono text-[10px]">#</TH>
            <SortHead col="id" label="Model" />
            <SortHead col="is_free" label="Tier" />
            <SortHead col="caps" label="Capabilities" />
            <SortHead col="ctx" label="Context" align="right" />
            <SortHead col="tps" label="TPS" align="right" />
            <SortHead col="balanced" label="Score" align="right" highlighted />
            <TH className="w-20 text-center">Action</TH>
          </TR>
        </THead>
        <TBody>
          {pageRows.map((m, i) => (
            <TR
              key={m.id}
              onClick={() => openDrawer(m.id)}
              role="button"
              tabIndex={0}
              aria-label={`View details for ${m.id}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDrawer(m.id); } }}
              className={cn(
                "cursor-pointer",
                drawerModelId === m.id && "bg-(--color-accent-soft) border-l-2 border-l-(--color-accent)"
              )}
            >
              <TD className="text-right pr-4 font-mono text-[11px] text-(--color-fg-subtle)">{start + i + 1}</TD>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center text-[10px] font-mono font-semibold text-(--color-fg-muted)">
                    {m.params >= 1 ? formatParams(m.params) : "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{m.id}</div>
                    <div className="text-[11px] text-(--color-fg-subtle) flex items-center gap-1.5">
                      <ProviderAvatar provider={m.provider} size="xs" />
                      {m.provider}
                    </div>
                  </div>
                </div>
              </TD>
              <TD>{m.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>}</TD>
              <TD>
                <div className="flex items-center gap-1.5">
                  {m.brain && <Badge variant="accent"><Brain className="w-2.5 h-2.5" />IQ</Badge>}
                  {m.tools && <Badge variant="info"><Wrench className="w-2.5 h-2.5" />TOOL</Badge>}
                  {m.open ? <BookOpen className="w-3 h-3 text-(--color-fg-subtle)" /> : <Lock className="w-3 h-3 text-(--color-fg-subtle)/40" />}
                </div>
              </TD>
              <TD className="text-right font-mono text-[12px] tabular-nums text-(--color-fg-muted)">{formatCtx(m.ctx)}</TD>
              <TD className="text-right font-mono text-[12px] tabular-nums">
                <span className={m.tps != null ? "text-(--color-warning)" : "text-(--color-fg-disabled) italic"}>
                  {m.tps != null ? m.tps.toFixed(1) : "-"}
                </span>
              </TD>
              <TD className="text-right font-mono text-[13px] font-semibold tabular-nums text-(--color-accent)">{m.balanced.toFixed(1)}</TD>
              <TD className="text-center">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startNewChat(m.id); router.push("/"); }} aria-label="Open chat">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Pagination
        start={start}
        end={end}
        total={total}
        page={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        onPage={setPage}
        onSize={setPageSize}
      />
    </div>
  );
}

function Pagination({ start, end, total, page, totalPages, pageSize, onPage, onSize }: {
  start: number; end: number; total: number; page: number; totalPages: number; pageSize: PageSize;
  onPage: (p: number) => void; onSize: (s: PageSize) => void;
}) {
  return (
    <div className="h-12 px-4 border-t border-(--color-border) flex items-center justify-between gap-4 bg-(--color-bg)">
      <div className="text-[11px] font-mono text-(--color-fg-subtle) tabular-nums">
        {start + 1}-{end} of {total}
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-(--color-fg-subtle)">Rows</span>
          {([50, 100, 200] as PageSize[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSize(s)}
              className={cn(
                "h-6 px-2 rounded text-[11px] font-mono cursor-pointer transition-colors duration-[120ms]",
                pageSize === s
                  ? "bg-(--color-accent-soft) text-(--color-accent)"
                  : "text-(--color-fg-muted) hover:bg-(--color-surface-2)",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-(--color-border)" />
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] font-mono tabular-nums text-(--color-fg-muted) min-w-[60px] text-center">
            {page} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortHead({ col, label, align = "left", highlighted = false }: { col: SortCol; label: string; align?: "left" | "right"; highlighted?: boolean }) {
  const { sort, setSort } = useFiltersStore();
  const active = sort.col === col;
  return (
    <TH className={cn("cursor-pointer select-none hover:text-(--color-fg)", align === "right" && "text-right", highlighted && "bg-(--color-accent-soft)")} onClick={() => setSort(col)}>
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {active && (sort.desc ? <ChevronDown className="w-3 h-3 text-(--color-accent)" /> : <ChevronUp className="w-3 h-3 text-(--color-accent)" />)}
      </span>
    </TH>
  );
}

function formatParams(b: number): string {
  if (b >= 1000) return `${(b / 1000).toFixed(b % 1000 === 0 ? 0 : 1)}T`;
  return `${b}B`;
}

function formatCtx(c: number): string {
  if (c >= 1_000_000) return `${(c / 1_000_000).toFixed(1)}M`;
  if (c >= 1_000) return `${Math.round(c / 1_000)}K`;
  return String(c);
}
