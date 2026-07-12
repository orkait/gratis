import type { ColumnDef } from "@tanstack/react-table";
import type { ModelStats } from "@/types/model";
import { DERIVED_COLUMNS, sortValue } from "./scores";

/** Column defs exist purely so the TanStack engine knows how to SORT each key - the cells are
 * rendered by hand in the row components. Keeping that split explicit stops anyone wiring cell
 * rendering into the engine and paying for a render pipeline we do not use. */

/** Scores are desc-first: "sort by intelligence" means "show me the smartest", not the dumbest.
 *  Identity and price are the opposite - clicking Cost must show the CHEAPEST first, and clicking
 *  Model must go A-Z. The table sets sortDescFirst globally, which is right for scores and wrong
 *  for these two, so they opt out. */
function sortableColumn(id: string, descFirst = true): ColumnDef<ModelStats> {
  return {
    id,
    accessorFn: (model) => sortValue(model, id),
    sortingFn: "basic",
    sortUndefined: "last",
    sortDescFirst: descFirst,
  };
}

const ASCENDING_FIRST = false;

export function buildColumns(scoreKeys: readonly string[]): ColumnDef<ModelStats>[] {
  const claimed = new Set<string>(Object.values(DERIVED_COLUMNS));

  const scoreColumns = scoreKeys
    .filter((key) => {
      if (claimed.has(key)) return false;
      claimed.add(key);
      return true;
    })
    .map((key) => sortableColumn(key));

  return [
    {
      id: DERIVED_COLUMNS.id,
      accessorFn: (model) => model.id,
      sortingFn: "text",
      sortDescFirst: ASCENDING_FIRST, // A-Z
    },
    sortableColumn(DERIVED_COLUMNS.free),
    sortableColumn(DERIVED_COLUMNS.capabilities),
    sortableColumn(DERIVED_COLUMNS.cost, ASCENDING_FIRST), // cheapest first
    ...scoreColumns,
  ];
}
