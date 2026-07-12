import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** The navbar bug: the detail drawer's backdrop was z-70 while the header was z-1020, so opening a
 * model dimmed the whole page EXCEPT the header, which stayed lit and read as "highlighted".
 * Two rival z-scales in one app. These tests pin the single scale so it cannot drift back. */

const raw = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
/** Comments explain the history and legitimately name the dead selector; assert on real CSS only. */
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

function z(name: string): number {
  const m = css.match(new RegExp(`--z-${name}:\\s*(\\d+)`));
  if (!m) throw new Error(`--z-${name} is not defined in globals.css`);
  return Number(m[1]);
}

describe("z-index scale", () => {
  it("defines every overlay layer", () => {
    for (const n of ["sticky", "modal-backdrop", "modal", "command-backdrop", "command", "tooltip"]) {
      expect(() => z(n)).not.toThrow();
    }
  });

  it("a modal backdrop covers the sticky header", () => {
    // The actual bug. If this ever inverts again, the header floats above the dimmed page.
    expect(z("modal-backdrop")).toBeGreaterThan(z("sticky"));
  });

  it("a modal panel sits above its own backdrop", () => {
    expect(z("modal")).toBeGreaterThan(z("modal-backdrop"));
  });

  it("the command palette clears any open modal", () => {
    expect(z("command-backdrop")).toBeGreaterThan(z("modal"));
    expect(z("command")).toBeGreaterThan(z("command-backdrop"));
  });

  it("tooltips float above everything they can live inside", () => {
    expect(z("tooltip")).toBeGreaterThan(z("command"));
  });

  it("has no ties - stacking must never depend on DOM order", () => {
    const all = ["sticky", "modal-backdrop", "modal", "command-backdrop", "command", "tooltip"].map(z);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe("one theme, not two", () => {
  it("the scoped .theme-editorial palette is gone", () => {
    // It hardcoded light values and ignored the theme toggle entirely.
    expect(css).not.toContain(".theme-editorial");
  });

  it("dark is a real override, not the implicit root default", () => {
    expect(css).toContain('[data-theme="dark"]');
  });
});
