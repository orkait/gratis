// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModelTable } from "./model-table";
import { useFiltersStore } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/models" }));

beforeEach(() => {
  useFiltersStore.getState().resetFilters();
  useFiltersStore.getState().setView("decision");
  global.ResizeObserver ||= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  global.matchMedia ||= (() => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as unknown as typeof matchMedia;
});

afterEach(cleanup);

const M = (over: Partial<ModelStats>): ModelStats =>
  ({
    id: "x",
    name: "x",
    params: null,
    ctx: 8192,
    is_free: false,
    capability: 1,
    brain: false,
    tools: false,
    open: false,
    tps: null,
    uptime: null,
    provider: "Groq",
    balanced: 0,
    value: 0,
    scores: { overall: 50 },
    ...over,
  }) as ModelStats;

function rowOrder(): string[] {
  return screen
    .getAllByRole("button", { name: /Details for/i })
    .map((row) => row.getAttribute("aria-label") ?? "");
}

describe("decision view is sortable by header", () => {
  it("clicking a header actually re-sorts", () => {
    // The bug: the decision view hard-coded its sort to the lens metric and DISCARDED
    // onSortingChange, so clicking a header was a silent no-op.
    const models = [
      M({ id: "low", scores: { overall: 10 } as ModelStats["scores"] }),
      M({ id: "high", scores: { overall: 90 } as ModelStats["scores"] }),
    ];

    render(<ModelTable models={models} loading={false} />);
    expect(rowOrder()[0]).toContain("high"); // lens default: overall desc

    fireEvent.click(screen.getByText("Overall"));
    expect(useFiltersStore.getState().sort).toEqual({ col: "overall", desc: false });
    expect(rowOrder()[0]).toContain("low"); // flipped to ascending
  });

  it("sorts by cost, and FREE counts as the cheapest thing there is", () => {
    // Free is genuinely 0, not "unknown": it must not fall to the bottom with the models whose
    // price we simply do not know.
    const models = [
      M({ id: "paid", is_free: false, price_out: 0.00005 }),
      M({ id: "free", is_free: true }),
    ];

    render(<ModelTable models={models} loading={false} />);
    fireEvent.click(screen.getByText("Cost"));

    expect(useFiltersStore.getState().sort.col).toBe("cost");
    expect(rowOrder()[0]).toContain("free");
  });

  it("switching lens takes the sort back to that lens's metric", () => {
    render(<ModelTable models={[M({ id: "a" })]} loading={false} />);

    fireEvent.click(screen.getByText("Cost"));
    expect(useFiltersStore.getState().sort.col).toBe("cost");

    useFiltersStore.getState().setLens("code");
    expect(useFiltersStore.getState().sort.col).toBe("fit_code");
  });
});
