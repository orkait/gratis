"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { Table as TableApi } from "@tanstack/react-table";
import { TH } from "@/components/ui/table";
import type { SortCol } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";
import { cn } from "@/lib/utils";

type Align = "left" | "right";

/** Replaces a nested ternary (`desc ? A : asc ? B : null`) with an exhaustive lookup. */
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
}: {
  table: TableApi<ModelStats>;
  col: SortCol;
  label: string;
  align?: Align;
  highlighted?: boolean;
}) {
  const column = table.getColumn(col);
  const direction = column?.getIsSorted() ?? false;
  const handleClick = column?.getToggleSortingHandler();

  return (
    <TH
      className={cn(
        "cursor-pointer select-none hover:text-(--color-fg)",
        align === "right" && "text-right",
        highlighted && "bg-(--color-accent-soft)",
      )}
      onClick={handleClick}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        <SortIcon direction={direction} />
      </span>
    </TH>
  );
}
