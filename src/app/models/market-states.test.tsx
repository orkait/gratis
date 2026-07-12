// @vitest-environment jsdom
/** The regression this locks down: a dead backend used to render "No models match your filters",
 * sending you to reset filters that were never the problem. Drives the real page through the real
 * useRankings/axios chain, with only the network stubbed. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import ModelsPage from "./page";
import { ROUTES } from "@/config/routes";

vi.mock("axios");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => ROUTES.market, // AppShell highlights the active nav link
}));

beforeEach(() => {
  global.ResizeObserver ||= class { observe() {} unobserve() {} disconnect() {} };
  global.matchMedia ||= (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  })) as unknown as typeof matchMedia;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ModelsPage />
    </QueryClientProvider>,
  );
}

describe("market states", () => {
  it("backend unreachable -> says so, and does NOT blame filters", async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error("Network Error"));
    renderPage();

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.getByText(/can't reach the backend/i)).toBeTruthy();
    expect(screen.queryByText(/no models match your filters/i)).toBeNull();
  });

  it("backend returns an empty market -> the filter message is correct here", async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => expect(screen.getByText(/no models match your filters/i)).toBeTruthy());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
