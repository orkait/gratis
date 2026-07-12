"use client";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZES } from "@/config/ui";
import type { PageSize } from "@/stores/filters-store";
import { cn } from "@/lib/utils";

type PaginationProps = {
  start: number;
  end: number;
  total: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  onPage: (page: number) => void;
  onSize: (size: PageSize) => void;
};

export function TablePagination({ start, end, total, page, totalPages, pageSize, onPage, onSize }: PaginationProps) {
  const goPrev = useCallback(() => onPage(page - 1), [onPage, page]);
  const goNext = useCallback(() => onPage(page + 1), [onPage, page]);

  return (
    <div className="h-12 px-4 border-t border-(--color-border) flex items-center justify-between gap-4 bg-(--color-bg)">
      <div className="text-[11px] font-mono text-(--color-fg-subtle) tabular-nums">
        {start + 1}-{end} of {total}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-(--color-fg-subtle)">Rows</span>
          {PAGE_SIZES.map((size) => (
            <PageSizeButton key={size} size={size} active={pageSize === size} onSelect={onSize} />
          ))}
        </div>

        <div className="h-4 w-px bg-(--color-border)" />

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={goPrev} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-[11px] font-mono tabular-nums text-(--color-fg-muted) min-w-[60px] text-center">
            {page} / {totalPages}
          </span>
          <Button variant="ghost" size="icon" onClick={goNext} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Its own component so the click handler binds `size` by reference rather than by closure in JSX. */
function PageSizeButton({
  size,
  active,
  onSelect,
}: {
  size: PageSize;
  active: boolean;
  onSelect: (size: PageSize) => void;
}) {
  const handleClick = useCallback(() => onSelect(size), [onSelect, size]);
  const tone = active
    ? "bg-(--color-accent-soft) text-(--color-accent)"
    : "text-(--color-fg-muted) hover:bg-(--color-surface-2)";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={active}
      className={cn("h-6 px-2 rounded text-[11px] font-mono cursor-pointer transition-colors duration-[120ms]", tone)}
    >
      {size}
    </button>
  );
}
