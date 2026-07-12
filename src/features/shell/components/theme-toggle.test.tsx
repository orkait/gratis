// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "./theme-toggle";

function mockSystem(dark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: dark && query.includes("dark"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

function renderToggle() {
  return render(
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

const theme = () => document.documentElement.getAttribute("data-theme");

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});
afterEach(cleanup);

describe("theme toggle", () => {
  it("a DARK-preferring user toggles to light, not to dark again", async () => {
    // The bug: `resolvedTheme` is undefined until next-themes mounts, and `undefined === "dark"` is
    // false - so the handler fell through to setTheme("dark"). Clicking while already dark did
    // nothing visible, and the toggle looked like a one-way trip into dark mode.
    mockSystem(true);
    renderToggle();
    await waitFor(() => expect(theme()).toBe("dark"));

    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    await waitFor(() => expect(theme()).toBe("light"));
  });

  it("a LIGHT-preferring user toggles to dark", async () => {
    mockSystem(false);
    renderToggle();
    await waitFor(() => expect(theme()).toBe("light"));

    fireEvent.click(screen.getByRole("button", { name: /theme/i }));
    await waitFor(() => expect(theme()).toBe("dark"));
  });

  it("round-trips: dark -> light -> dark", async () => {
    mockSystem(true);
    renderToggle();
    await waitFor(() => expect(theme()).toBe("dark"));

    const button = screen.getByRole("button", { name: /theme/i });
    fireEvent.click(button);
    await waitFor(() => expect(theme()).toBe("light"));
    fireEvent.click(button);
    await waitFor(() => expect(theme()).toBe("dark"));
  });
});
