"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Table as TableApi } from "@tanstack/react-table";
import { TH } from "@/components/ui/table";
import type { SortCol } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";

type Align = "left" | "right";

/** Replaces a nested ternary (`desc ? A : asc ? B : null`) with an exhaustive lookup. */
/** Screen readers get the sort state too, not just sighted users looking at a chevron. */
function ariaSort(direction: "asc" | "desc" | false): "ascending" | "descending" | "none" {
  if (direction === "asc") return "ascending";
  if (direction === "desc") return "descending";
  return "none";
}

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "desc") return <ChevronDown className="w-3 h-3 text-(--color-accent)" />;
  if (direction === "asc") return <ChevronUp className="w-3 h-3 text-(--color-accent)" />;
  return null;
}

export function SortHead({
  table,
  col,
  label,
  align = "left",
  highlighted = false,
  className,
}: {
  table: TableApi<ModelStats>;
  col: SortCol;
  label: string;
  align?: Align;
  highlighted?: boolean;
  className?: string;
}) {
  const column = table.getColumn(col);
  const direction = column?.getIsSorted() ?? false;
  const handleClick = column?.getToggleSortingHandler();

  // A header that cannot sort must not LOOK sortable. Without this, an unregistered column renders
  // a pointer cursor and a hover state and then does nothing when clicked - a silent no-op.
  const sortable = Boolean(column);

  return (
    <TH
      className={cn(
        "select-none",
        sortable && "cursor-pointer hover:text-(--color-fg)",
        align === "right" && "text-right",
        highlighted && "bg-(--color-accent-soft)",
        className,
      )}
      onClick={handleClick}
      aria-sort={ariaSort(direction)}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        <SortIcon direction={direction} />
      </span>
    </TH>
  );
}
