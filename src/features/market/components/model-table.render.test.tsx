// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ModelTable } from "./model-table";
import { useFiltersStore } from "@/stores/filters-store";
import type { ModelStats } from "@/types/model";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

const M = (id: string, overall: number, extra: Partial<ModelStats> = {}): ModelStats => ({
  id, name: id, params: 1, ctx: 1000, is_free: false,
  capability: 0, brain: false, tools: false, open: false,
  tps: null, uptime: null, provider: "OpenRouter", balanced: overall, value: 0,
  intel: null, intel_coding: null, intel_math: null, intel_est: true,
  scores: { overall, intelligence: overall, coding: overall, tool_use: overall, speed: overall, fit_code: overall } as ModelStats["scores"],
  ...extra,
});

const rowIds = () =>
  screen.getAllByRole("button", { name: /^Details for / })
    .map((el) => el.getAttribute("aria-label")!.replace("Details for ", ""));

beforeEach(() => {
  useFiltersStore.setState({ view: "decision", lens: "overall", sort: { col: "overall", desc: true }, page: 1, pageSize: 50 });
});
afterEach(cleanup);

describe("ModelTable engine (render)", () => {
  it("decision view ranks by the lens metric, highest first", () => {
    render(<ModelTable models={[M("m/low", 10), M("m/high", 90), M("m/mid", 50)]} loading={false} />);
    expect(rowIds()).toEqual(["m/high", "m/mid", "m/low"]);
  });

  it("header click sorts by that column - names A-Z first, scores highest first", () => {
    // Scores are desc-first ("sort by intelligence" means show me the smartest). A NAME column is
    // the opposite: clicking Model must go A-Z, not Z-A.
    useFiltersStore.setState({ view: "detailed" });
    render(<ModelTable models={[M("m/high", 90), M("m/low", 10), M("m/mid", 50)]} loading={false} />);
    expect(rowIds()).toEqual(["m/high", "m/mid", "m/low"]); // default: overall desc

    fireEvent.click(screen.getByText("Model")); // by id, ascending first
    expect(rowIds()).toEqual(["m/high", "m/low", "m/mid"]);

    fireEvent.click(screen.getByText("Model")); // toggle to descending
    expect(rowIds()).toEqual(["m/mid", "m/low", "m/high"]);
  });

  it("paginates through the engine — pageSize caps rendered rows", () => {
    const many = Array.from({ length: 120 }, (_, i) => M(`m/${String(i).padStart(3, "0")}`, i));
    useFiltersStore.setState({ pageSize: 50 });
    render(<ModelTable models={many} loading={false} />);
    expect(rowIds()).toHaveLength(50);
    expect(screen.getByText("1-50 of 120")).toBeTruthy();
    expect(rowIds()[0]).toBe("m/119"); // overall desc → highest index first
  });
});
