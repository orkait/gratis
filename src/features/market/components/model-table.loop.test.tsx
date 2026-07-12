// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { ModelTable } from "./model-table";
import { useFiltersStore } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
beforeEach(() => {
  global.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  global.matchMedia ||= (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof matchMedia;
});

const M = (i: number): ModelStats => ({
  id: `p/m-${i}`, name: `m${i}`, params: 1, ctx: 1000, is_free: false,
  capability: 0, brain: false, tools: false, open: false, tps: null, uptime: null,
  provider: "OpenRouter", balanced: i, value: 0, intel: null, intel_coding: null, intel_math: null, intel_est: true,
  scores: { overall: i } as ModelStats["scores"],
});
const MODELS = Array.from({ length: 60 }, (_, i) => M(i));

afterEach(cleanup);

describe("no pagination/sort thrash on data settle (autoReset loop guard)", () => {
  it("mount + repeated react-query-style data updates do not storm store setters", () => {
    const calls = { page: 0, size: 0, sort: 0 };
    const s = useFiltersStore.getState();
    const wrapPage = s.setPage, wrapSize = s.setPageSize, wrapSort = s.setSortRaw;
    useFiltersStore.setState({
      view: "decision", lens: "overall", sort: { col: "overall", desc: true }, page: 1, pageSize: 50,
      setPage: (p) => { calls.page++; wrapPage(p); },
      setPageSize: (x) => { calls.size++; wrapSize(x); },
      setSortRaw: (x) => { calls.sort++; wrapSort(x); },
    });

    const { rerender } = render(<Tooltip.Provider><ModelTable models={MODELS} loading={false} /></Tooltip.Provider>);
    // simulate 5 react-query settles (new array ref each time, like refetch/background updates)
    for (let i = 0; i < 5; i++) {
      act(() => { rerender(<Tooltip.Provider><ModelTable models={[...MODELS]} loading={false} /></Tooltip.Provider>); });
    }

    // a feedback loop (autoReset -> onPaginationChange -> setPage -> re-render -> ...) would blow these up.
    expect(calls.page).toBeLessThan(10);
    expect(calls.sort).toBe(0); // decision view must never write sort back to the store
  });
});
