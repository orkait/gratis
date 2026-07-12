import type { ColumnDef } from "@tanstack/react-table";
import type { ModelStats } from "@/types/model";
import { DERIVED_COLUMNS, sortValue } from "./scores";

/** Column defs exist purely so the TanStack engine knows how to SORT each key - the cells are
 * rendered by hand in the row components. Keeping that split explicit stops anyone wiring cell
 * rendering into the engine and paying for a render pipeline we do not use. */

function sortableColumn(id: string): ColumnDef<ModelStats> {
  return {
    id,
    accessorFn: (model) => sortValue(model, id),
    sortingFn: "basic",
    sortUndefined: "last",
  };
}

export function buildColumns(scoreKeys: readonly string[]): ColumnDef<ModelStats>[] {
  const claimed = new Set<string>(Object.values(DERIVED_COLUMNS));

  const scoreColumns = scoreKeys
    .filter((key) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    })
    .map(sortableColumn);

  return [
    { id: DERIVED_COLUMNS.id, accessorFn: (model) => model.id, sortingFn: "text" },
    sortableColumn(DERIVED_COLUMNS.free),
    sortableColumn(DERIVED_COLUMNS.capabilities),
    ...scoreColumns,
  ];
}
