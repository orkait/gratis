/** UI limits and defaults. Numbers that appeared inline in components live here so they can be
 *  reasoned about together. Visual tokens (colour, radius, z-index) stay in globals.css. */

export const SIDEBAR = {
  defaultWidth: 240,
  minWidth: 200,
  maxWidth: 400,
} as const;

export const PAGE_SIZES = [25, 50, 100, 200] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** 25 fits a laptop viewport without scrolling the header out of sight. Anyone who wants a denser
 *  page is one click away, and the choice persists. */
export const DEFAULT_PAGE_SIZE: PageSize = 25;

/** Transition/animation durations in ms, matching the CSS token scale. */
export const DURATION = {
  fast: 120,
  base: 180,
  slow: 250,
} as const;
