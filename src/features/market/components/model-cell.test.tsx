// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ModelCell } from "./model-cell";
import type { ModelStats } from "@/types/model";

beforeEach(() => {
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
    id: "groq/llama-3.3-70b-versatile",
    name: "llama",
    params: null,
    ctx: 8192,
    is_free: true,
    capability: 1,
    brain: false,
    tools: false,
    open: false,
    tps: null,
    uptime: null,
    provider: "Groq",
    balanced: 0,
    value: 0,
    ...over,
  }) as ModelStats;

describe("model cell", () => {
  it("shows the size when the provider publishes one", () => {
    render(<ModelCell model={M({ params: 70 })} showHonesty={false} />);
    expect(screen.getByText("70B")).toBeTruthy();
  });

  it("renders NO size element - and no placeholder - when the size is unknown", () => {
    // 190 of 270 live models publish no size. The cell used to reserve a 36px slot for every one
    // of them, so nearly every row carried an empty box between the rank and the model name.
    // You cannot reserve a column for data that mostly does not exist.
    const { container } = render(<ModelCell model={M({ params: null })} showHonesty={false} />);

    expect(screen.queryByText(/\dB$/)).toBeNull();
    // Nothing may be rendered purely to hold space.
    expect(container.querySelector("[aria-hidden]")).toBeNull();
  });

  it("never invents a size", () => {
    // The backend used to default an unparseable size to 1.0, so Claude Opus rendered as "1B".
    render(<ModelCell model={M({ id: "anthropic/claude-opus-4.8", params: null })} showHonesty={false} />);
    expect(screen.queryByText("1B")).toBeNull();
  });
});
