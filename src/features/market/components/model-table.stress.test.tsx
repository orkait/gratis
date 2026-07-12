// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { ModelTable } from "./model-table";
import { useFiltersStore } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

// jsdom lacks these; Base UI Tooltip touches them defensively.
beforeEach(() => {
  global.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  global.matchMedia ||= (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} })) as unknown as typeof matchMedia;
});

// Production-density row: every honesty signal present so all InfoTips (Base UI tooltips) mount.
const DIVS = ["aligned", "human-favored", "bench-favored"] as const;
const CONF = ["high", "medium", "low"] as const;
const model = (i: number): ModelStats => {
  const s = 40 + (i % 55);
  return {
    id: `prov${i % 6}/model-${String(i).padStart(3, "0")}`, name: `model ${i}`,
    params: 1 + (i % 400), ctx: 128000, is_free: i % 3 === 0,
    capability: s, brain: i % 2 === 0, tools: i % 3 !== 0, open: i % 4 === 0,
    tps: i % 5 === 0 ? null : 40 + i, uptime: 99, provider: `Provider ${i % 6}`, balanced: s, value: 1000 + i,
    intel: s, intel_coding: s, intel_math: s, intel_est: false,
    scores: {
      overall: s, intelligence: s, coding: s - 2, reasoning: s - 1, math: s, tool_use: s - 3,
      knowledge: s, instruction: s, speed: s, value: s, affordability: s, context: s, reliability: 99,
      fit_chat: s, fit_code: s - 2, fit_math: s, fit_agent: s - 1, fit_budget: s, fit_fast: s,
    } as ModelStats["scores"],
    archetype: (["flagship", "workhorse", "budget"] as const)[i % 3],
    badges: ["tools", "reasoning"], bench_count: 5 + (i % 6), consensus: 40 + (i % 50),
    confidence: CONF[i % 3], arena_elo: 1300 + i, arena_votes: 100, preference: 30 + (i % 60), divergence: DIVS[i % 3],
  };
};
const MODELS = Array.from({ length: 60 }, (_, i) => model(i));

const renderTable = () =>
  render(
    <Tooltip.Provider>
      <ModelTable models={MODELS} loading={false} />
    </Tooltip.Provider>,
  );
const rowCount = () => screen.getAllByRole("button", { name: /^Details for / }).length;

beforeEach(() => useFiltersStore.setState({ view: "decision", lens: "overall", sort: { col: "overall", desc: true }, page: 1, pageSize: 50 }));
afterEach(cleanup);

describe("ModelTable stress (full density, 60 rows, all honesty tooltips)", () => {
  it("mounts the full-density decision view without a render loop", () => {
    renderTable();
    expect(rowCount()).toBe(50); // page cap
  });

  it("survives a rapid interaction storm without exceeding update depth", () => {
    renderTable();
    const store = useFiltersStore.getState();

    // hammer: view flips, sort clicks, lens changes, page size, pagination
    for (let round = 0; round < 3; round++) {
      store.setView("detailed");
      ["Model", "Intel", "Overall", "Cheap", "Uptime"].forEach((label) => {
        const th = screen.queryAllByText(label)[0];
        if (th) { fireEvent.click(th); fireEvent.click(th); }
      });
      store.setPageSize(100);
      store.setPageSize(50);
      store.setView("decision");
      (["overall", "code", "agent", "reasoning", "budget", "fast"] as const).forEach((l) => store.setLens(l));
    }
    // if any of the above triggered an infinite loop, React would have thrown by now.
    expect(rowCount()).toBeGreaterThan(0);
  });

  it("stays interactive: audit header click actually reorders", () => {
    useFiltersStore.setState({ view: "detailed" });
    renderTable();
    const firstBefore = screen.getAllByRole("button", { name: /^Details for / })[0].getAttribute("aria-label");
    fireEvent.click(screen.getAllByText("Model")[0]); // sort by id desc
    const firstAfter = screen.getAllByRole("button", { name: /^Details for / })[0].getAttribute("aria-label");
    expect(firstAfter).not.toBe(firstBefore);
  });
});
