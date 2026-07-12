import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/** The type scale was previously DEFINED and then completely IGNORED: 126 call sites wrote arbitrary
 * values like text-[8px] instead, which is why the whole UI read as microscopic. These tests keep the
 * scale the single source of truth. */

const raw = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
const css = raw.replace(/\/\*[\s\S]*?\*\//g, "");

const MIN_READABLE_PX = 11;

function tsxFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) tsxFiles(path, acc);
    else if (path.endsWith(".tsx")) acc.push(path);
  }
  return acc;
}

function scaleSize(name: string): number {
  const match = css.match(new RegExp(`--text-${name}:\\s*(\\d+)px`));
  if (!match) throw new Error(`--text-${name} is not defined`);
  return Number(match[1]);
}

describe("type scale", () => {
  it("defines every step", () => {
    for (const step of ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"]) {
      expect(() => scaleSize(step)).not.toThrow();
    }
  });

  it("ascends monotonically", () => {
    const sizes = ["2xs", "xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl"].map(scaleSize);
    const sorted = [...sizes].sort((a, b) => a - b);
    expect(sizes).toEqual(sorted);
    expect(new Set(sizes).size).toBe(sizes.length);
  });

  it("never ships anything smaller than 11px", () => {
    // The old UI had text-[8px]. That is not a design choice, it is an accessibility bug.
    expect(scaleSize("2xs")).toBeGreaterThanOrEqual(MIN_READABLE_PX);
  });

  it("has a comfortable body size", () => {
    expect(scaleSize("base")).toBeGreaterThanOrEqual(15);
  });
});

describe("no component bypasses the scale", () => {
  it("has zero hardcoded text-[Npx] anywhere in src", () => {
    const offenders = tsxFiles("src")
      .filter((file) => !file.includes(".test."))
      .flatMap((file) => {
        const hits = readFileSync(file, "utf8").match(/text-\[\d+px\]/g) ?? [];
        return hits.map((hit) => `${file}: ${hit}`);
      });

    expect(offenders).toEqual([]);
  });
});


describe("no arbitrary Tailwind values", () => {
  /** `w-[300px]` is the same sin as `text-[8px]`: a number nobody registered, nobody can find, and
   * nobody can change in one place. Everything sizeable must come from a token in globals.css.
   *
   * These bracket forms are NOT magic values and are allowed:
   *   data-[pressed]        variant selector
   *   group-data-[...]      variant selector
   *   transition-[width]    property list, not a measurement
   *   *-[calc(...)]         a computed relationship, which is exactly what a token cannot express
   */
  const ALLOWED = /^(data|group-data|peer-data|aria|has|not|supports|transition)-\[/;
  const COMPUTED = /-\[calc\(/;

  it("has zero unregistered arbitrary values in src", () => {
    const offenders = tsxFiles("src")
      .filter((file) => !file.includes(".test."))
      .flatMap((file) => {
        const hits = readFileSync(file, "utf8").match(/\b[a-z-]+-\[[^\]]+\]/g) ?? [];
        return hits
          .filter((hit) => !ALLOWED.test(hit) && !COMPUTED.test(hit))
          .map((hit) => `${file}: ${hit}`);
      });

    expect(offenders).toEqual([]);
  });
});

describe("layout tokens are registered", () => {
  it("every table column width is a token", () => {
    for (const col of ["col-rank", "col-model", "col-score", "col-cost", "col-action"]) {
      expect(css).toMatch(new RegExp(`--spacing-${col}:`));
    }
  });

  it("every overlay width is a token", () => {
    for (const overlay of ["tooltip", "drawer", "sheet", "popover", "dialog"]) {
      expect(css).toMatch(new RegExp(`--container-${overlay}:`));
    }
  });

  it("the accent has a hover step, so no component invents one", () => {
    // button.tsx used to hover to a hardcoded oklch(0.55 0.165 265) - the electric blue from the
    // PREVIOUS palette, which no longer exists anywhere else in the system.
    expect(css).toMatch(/--color-accent-hover:/);
  });
});
