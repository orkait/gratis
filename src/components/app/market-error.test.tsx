// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MarketError } from "./market-error";

afterEach(cleanup);

describe("MarketError", () => {
  it("names the backend as the problem, not the user's filters", () => {
    render(<MarketError onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(/can't reach the backend/i)).toBeTruthy();
    // The whole point: it must never blame filters for a dead server.
    expect(screen.queryByText(/no models match your filters/i)).toBeNull();
  });

  it("gives the user a way out", () => {
    const onRetry = vi.fn();
    render(<MarketError onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("surfaces the underlying error so the cause is diagnosable", () => {
    render(<MarketError onRetry={() => {}} message="Network Error" />);
    expect(screen.getByText(/network error/i)).toBeTruthy();
  });
});
