# UI Overhaul — Linear-style (premium-precision)

**Source:** `DESIGN.md` (approved 2026-05-02)
**Stack:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (Base UI edition) + lucide-react + zustand
**Removes:** daisyui, framer-motion (unused), tailwind-merge (replaced by `cn` from clsx)

## MCP Survey (verified 2026-05-02)

- `designer_resolve_intent` → personality: premium-precision; mode: dark; density: compact
- `designer_get_personality("technical-developer")` + `designer_get_preset("linear")` → tokens in DESIGN.md S2-S7
- `designer_get_page_template("dashboard")` → sidebar 240px, header 48-64px, KPI row, table, detail drawer, empty states
- `designer_get_anti_patterns("developer-tool")` → 35 patterns embedded as DESIGN.md S10
- `shadcn_get_rules` → @base-ui/react primitives, data-slot attributes, OKLCH tokens, cva for variants, cn from utils
- `shadcn_get_composition("dashboard")` → NavigationMenu/Tooltip · DropdownMenu/Command/Avatar · Card/Skeleton · Table/Input/Select/Pagination/Checkbox · Sheet/Tabs · Card/Button
- `shadcn_list_components` → curated catalog has Button, Dialog, Field, Select. Others installed via `npx shadcn@latest add` from upstream registry (Base UI edition).

## File Map

```
Modify  package.json                            - swap deps
Modify  src/app/globals.css                     - OKLCH tokens + Tailwind v4 @theme
Modify  src/app/layout.tsx                      - Geist fonts + dark-default theme
Modify  src/app/page.tsx                        - new app shell, ditch daisyui
Delete  none                                    - keep src/components/ChatModal.tsx but rewrite
Modify  src/components/ChatModal.tsx            - rewrite using Sheet + new tokens
Modify  src/components/ModelTable.tsx           - rewrite using shadcn Table primitive
Create  src/lib/utils.ts                        - cn() helper
Create  src/lib/store.ts                        - zustand: filters/drawer/cmdk/theme
Create  src/lib/types.ts                        - ModelStats type centralized
Create  src/components/ui/button.tsx            - shadcn Button (Base UI)
Create  src/components/ui/dialog.tsx            - shadcn Dialog (Base UI)
Create  src/components/ui/sheet.tsx             - Base UI dialog + slide-from-right
Create  src/components/ui/command.tsx           - cmdk primitive
Create  src/components/ui/tabs.tsx              - Base UI tabs
Create  src/components/ui/card.tsx              - container primitive
Create  src/components/ui/badge.tsx             - cva-driven pill
Create  src/components/ui/skeleton.tsx          - shimmer block
Create  src/components/ui/tooltip.tsx           - Base UI tooltip
Create  src/components/ui/input.tsx             - text input primitive
Create  src/components/ui/table.tsx             - composable table primitives
Create  src/components/ui/separator.tsx         - 1px line
Create  src/components/ui/scroll-area.tsx       - styled overflow container
Create  src/components/ui/kbd.tsx               - keyboard key chip
Create  src/components/app/sidebar.tsx          - filter panel
Create  src/components/app/header.tsx           - title + cmdk trigger + theme
Create  src/components/app/kpi-strip.tsx        - 5 metric cards
Create  src/components/app/provider-chips.tsx   - provider filter row
Create  src/components/app/model-table.tsx      - sortable data table (replaces ModelTable.tsx)
Create  src/components/app/detail-drawer.tsx    - Sheet + Tabs detail
Create  src/components/app/command-palette.tsx  - Cmd+K
Create  src/components/app/chat-sheet.tsx       - new chat panel
Create  src/components/app/theme-toggle.tsx     - dark/light switch
Test    src/lib/store.test.ts                   - zustand reducer logic
Test    src/components/app/model-table.test.tsx - sort + filter behavior
```

---

## Track A — Foundation (sequential)

### Task 1 — Dependency swap

**Files:**
- Modify: `package.json`

**MCP refs:** shadcn_get_rules (cva, clsx, base-ui).

- [ ] **Step 1: Remove daisyui, framer-motion, tailwind-merge, openai (server-only, gone)**

```bash
npm uninstall daisyui framer-motion tailwind-merge
```

- [ ] **Step 2: Add Base UI + cva + clsx + zustand + cmdk + geist**

```bash
npm install @base-ui-components/react class-variance-authority clsx zustand cmdk geist
```

- [ ] **Step 3: Verify**

```bash
node -e "console.log(Object.keys(require('./package.json').dependencies))"
```

Expected: includes `@base-ui-components/react`, `class-variance-authority`, `clsx`, `zustand`, `cmdk`, `geist`. Excludes `daisyui`, `framer-motion`, `tailwind-merge`.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: swap daisyui→shadcn-base-ui stack (cva, clsx, zustand, cmdk, geist)"
```

---

### Task 2 — Tailwind v4 tokens + globals.css

**Files:**
- Modify: `src/app/globals.css`

**MCP refs:** DESIGN.md S2 (color), S3 (typography), S4 (spacing), S6 (motion), S7 (elevation).

- [ ] **Step 1: Replace entire globals.css with OKLCH token system**

```css
@import "tailwindcss";

@theme {
  /* ============ COLORS (OKLCH only) ============ */
  --color-bg: oklch(0.115 0.008 260);
  --color-fg: oklch(0.95 0.005 260);
  --color-fg-muted: oklch(0.72 0.006 260);
  --color-fg-subtle: oklch(0.50 0.008 260);
  --color-fg-disabled: oklch(0.36 0.008 260);
  --color-surface-1: oklch(0.155 0.008 260);
  --color-surface-2: oklch(0.190 0.008 260);
  --color-surface-3: oklch(0.230 0.008 260);
  --color-border: oklch(1 0 0 / 0.08);
  --color-border-strong: oklch(1 0 0 / 0.14);

  --color-accent: oklch(0.60 0.165 265);
  --color-accent-fg: oklch(0.99 0 0);
  --color-accent-soft: oklch(0.60 0.165 265 / 0.12);

  --color-success: oklch(0.65 0.15 145);
  --color-success-soft: oklch(0.65 0.15 145 / 0.14);
  --color-warning: oklch(0.78 0.16 75);
  --color-warning-soft: oklch(0.78 0.16 75 / 0.14);
  --color-danger: oklch(0.62 0.20 25);
  --color-danger-soft: oklch(0.62 0.20 25 / 0.14);
  --color-info: oklch(0.68 0.13 230);
  --color-info-soft: oklch(0.68 0.13 230 / 0.14);

  --color-provider-openrouter: oklch(0.68 0.18 35);
  --color-provider-ollama: oklch(0.62 0.16 200);
  --color-provider-aistudio: oklch(0.70 0.15 90);
  --color-provider-groq: oklch(0.65 0.20 25);
  --color-provider-cerebras: oklch(0.60 0.16 290);
  --color-provider-cloudflare: oklch(0.72 0.18 60);

  /* ============ TYPOGRAPHY ============ */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;

  --text-display: 28px;
  --text-display--line-height: 1.1;
  --text-h1: 22px;
  --text-h1--line-height: 1.2;
  --text-h2: 18px;
  --text-h2--line-height: 1.25;
  --text-h3: 15px;
  --text-h3--line-height: 1.3;
  --text-body: 14px;
  --text-body--line-height: 1.5;
  --text-body-sm: 13px;
  --text-body-sm--line-height: 1.45;
  --text-caption: 11px;
  --text-caption--line-height: 1.35;

  /* ============ RADIUS ============ */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 10px;

  /* ============ MOTION ============ */
  --animate-shimmer: shimmer 1.4s linear infinite;
}

/* light-mode override (data-theme=light on <html>) */
:root[data-theme="light"] {
  --color-bg: oklch(0.99 0.003 260);
  --color-fg: oklch(0.13 0.005 260);
  --color-fg-muted: oklch(0.40 0.007 260);
  --color-fg-subtle: oklch(0.55 0.008 260);
  --color-fg-disabled: oklch(0.70 0.008 260);
  --color-surface-1: oklch(0.97 0.005 260);
  --color-surface-2: oklch(0.94 0.006 260);
  --color-surface-3: oklch(0.91 0.007 260);
  --color-border: oklch(0 0 0 / 0.08);
  --color-border-strong: oklch(0 0 0 / 0.14);
}

@layer base {
  html, body {
    background: var(--color-bg);
    color: var(--color-fg);
    font-family: var(--font-sans);
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    letter-spacing: -0.011em;
    -webkit-font-smoothing: antialiased;
  }

  *, *::before, *::after {
    box-sizing: border-box;
  }

  /* Mandatory reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Focus rings — every interactive element */
  :where(a, button, input, select, textarea, [tabindex]):focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    border-radius: var(--radius-md);
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(tokens): OKLCH design system per DESIGN.md (Linear premium-precision)"
```

---

### Task 3 — Geist fonts + dark-default layout

**Files:**
- Modify: `src/app/layout.tsx`

**MCP refs:** DESIGN.md S3 typography, S1 atmosphere.

- [ ] **Step 1: Replace layout.tsx**

```tsx
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZeroCostLLM — Free LLM Market",
  description: "Real-time market intelligence for free LLM models across 7 providers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(layout): wire Geist sans+mono via next/font, dark-default"
```

---

### Task 4 — Utils + types + zustand store

**Files:**
- Create: `src/lib/utils.ts`
- Create: `src/lib/types.ts`
- Create: `src/lib/store.ts`
- Create: `src/lib/store.test.ts`

**MCP refs:** shadcn_get_rules (cn helper); react_get_pattern("zustand-store"); DESIGN.md S5 (state shape).

- [ ] **Step 1: Create utils.ts**

```ts
import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number, digits = 1): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(digits)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(digits)}K`;
  return n.toFixed(digits);
}
```

- [ ] **Step 2: Create types.ts**

```ts
export type ModelStats = {
  id: string;
  name: string;
  params: number;
  ctx: number;
  is_free: boolean;
  capability: number;
  brain: boolean;
  tools: boolean;
  open: boolean;
  tps: number | null;
  uptime: number | null;
  provider: string;
  balanced: number;
  value: number;
};

export type ProviderFilter =
  | "all" | "openrouter" | "ollama" | "aistudio" | "groq" | "cerebras" | "cloudflare";

export const PROVIDER_LABEL: Record<string, string> = {
  Ollama: "ollama",
  "Google AI Studio": "aistudio",
  Groq: "groq",
  Cerebras: "cerebras",
  "Cloudflare Workers AI": "cloudflare",
};
```

- [ ] **Step 3: Create store.ts (zustand)**

```ts
import { create } from "zustand";
import type { ProviderFilter } from "./types";

export type SortCol = "balanced" | "value" | "tps" | "ctx" | "params" | "id";

export type Filters = {
  freeOnly: boolean;
  openOnly: boolean;
  brain: boolean;
  tools: boolean;
  minParams: number;
  minCtx: number;
  search: string;
  provider: ProviderFilter;
};

type State = {
  filters: Filters;
  setFilter: <K extends keyof Filters>(k: K, v: Filters[K]) => void;
  resetFilters: () => void;
  sort: { col: SortCol; desc: boolean };
  setSort: (col: SortCol) => void;
  drawerModelId: string | null;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  cmdkOpen: boolean;
  setCmdk: (v: boolean) => void;
  chatModelId: string | null;
  openChat: (id: string) => void;
  closeChat: () => void;
  theme: "dark" | "light";
  toggleTheme: () => void;
};

const DEFAULT_FILTERS: Filters = {
  freeOnly: false, openOnly: false, brain: false, tools: false,
  minParams: 0, minCtx: 0, search: "", provider: "all",
};

export const useStore = create<State>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilter: (k, v) => set((s) => ({ filters: { ...s.filters, [k]: v } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS }),
  sort: { col: "balanced", desc: true },
  setSort: (col) => set((s) => ({
    sort: s.sort.col === col ? { col, desc: !s.sort.desc } : { col, desc: true }
  })),
  drawerModelId: null,
  openDrawer: (id) => set({ drawerModelId: id }),
  closeDrawer: () => set({ drawerModelId: null }),
  cmdkOpen: false,
  setCmdk: (v) => set({ cmdkOpen: v }),
  chatModelId: null,
  openChat: (id) => set({ chatModelId: id }),
  closeChat: () => set({ chatModelId: null }),
  theme: "dark",
  toggleTheme: () => set((s) => {
    const next = s.theme === "dark" ? "light" : "dark";
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = next === "light" ? "light" : "";
    }
    return { theme: next };
  }),
}));
```

- [ ] **Step 4: Failing test**

```ts
// src/lib/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "./store";

describe("useStore", () => {
  beforeEach(() => useStore.getState().resetFilters());

  it("toggles sort direction when same column reselected", () => {
    useStore.getState().setSort("tps");
    expect(useStore.getState().sort).toEqual({ col: "tps", desc: true });
    useStore.getState().setSort("tps");
    expect(useStore.getState().sort.desc).toBe(false);
  });

  it("resets desc=true when changing column", () => {
    useStore.getState().setSort("tps");
    useStore.getState().setSort("tps"); // desc = false
    useStore.getState().setSort("ctx");
    expect(useStore.getState().sort).toEqual({ col: "ctx", desc: true });
  });

  it("setFilter mutates only the named key", () => {
    useStore.getState().setFilter("freeOnly", true);
    expect(useStore.getState().filters.freeOnly).toBe(true);
    expect(useStore.getState().filters.openOnly).toBe(false);
  });
});
```

```bash
npx vitest run src/lib/store.test.ts
```

Expected: PASS 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/lib/
git commit -m "feat(state): zustand store for filters/sort/drawer/cmdk/chat/theme"
```

---

## Track B — shadcn primitives (parallel after Track A)

### Task 5 — Install shadcn Base UI primitives

**Files:**
- Create: `src/components/ui/{button,dialog,sheet,tabs,card,badge,skeleton,tooltip,input,table,separator,scroll-area,kbd,command}.tsx`

**MCP refs:** shadcn_get_rules; shadcn_get_composition("dashboard").

Hand-author each primitive following shadcn Base UI conventions: `'use client'` for stateful, `data-slot` attrs, `cva` variants, `cn` className merge, OKLCH tokens, no Radix imports.

- [ ] **Step 1: src/components/ui/button.tsx**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-[13px] font-medium transition-[background,color,border] duration-[120ms] ease-out focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-(--color-accent) text-(--color-accent-fg) hover:bg-[oklch(0.55_0.165_265)]",
        outline: "border border-(--color-border-strong) bg-(--color-surface-1) text-(--color-fg) hover:bg-(--color-surface-2)",
        secondary: "bg-(--color-surface-2) text-(--color-fg) hover:bg-(--color-surface-3)",
        ghost: "bg-transparent text-(--color-fg-muted) hover:bg-(--color-surface-1) hover:text-(--color-fg)",
        destructive: "bg-(--color-danger) text-white hover:opacity-90",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        lg: "h-9 px-4",
        icon: "h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button data-slot="button" className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
```

- [ ] **Step 2: src/components/ui/badge.tsx**

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded font-mono text-[11px] font-medium px-1.5 h-[18px] tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-(--color-surface-2) text-(--color-fg-muted) border border-(--color-border)",
        success: "bg-(--color-success-soft) text-(--color-success)",
        warning: "bg-(--color-warning-soft) text-(--color-warning)",
        danger: "bg-(--color-danger-soft) text-(--color-danger)",
        info: "bg-(--color-info-soft) text-(--color-info)",
        accent: "bg-(--color-accent-soft) text-(--color-accent)",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;
export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}
```

- [ ] **Step 3: src/components/ui/card.tsx**

```tsx
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card" className={cn("bg-(--color-surface-1) border border-(--color-border) rounded-lg", className)} {...props} />;
}
export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-header" className={cn("px-5 py-4", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="card-content" className={cn("px-5 pb-5", className)} {...props} />;
}
```

- [ ] **Step 4: src/components/ui/input.tsx**

```tsx
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-8 w-full rounded-md bg-(--color-surface-1) border border-(--color-border) px-2.5 text-[13px] text-(--color-fg) placeholder:text-(--color-fg-subtle) outline-none transition-colors duration-[120ms] focus:border-(--color-accent) focus:ring-2 focus:ring-(--color-accent-soft)",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 5: src/components/ui/skeleton.tsx**

```tsx
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "relative overflow-hidden rounded-md bg-(--color-surface-2)",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 6: src/components/ui/separator.tsx**

```tsx
import { cn } from "@/lib/utils";
export function Separator({ className, orientation = "horizontal", ...props }: { orientation?: "horizontal" | "vertical" } & React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="separator" role="separator" aria-orientation={orientation} className={cn("bg-(--color-border)", orientation === "horizontal" ? "h-px w-full" : "h-full w-px", className)} {...props} />;
}
```

- [ ] **Step 7: src/components/ui/kbd.tsx**

```tsx
import { cn } from "@/lib/utils";
export function Kbd({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd data-slot="kbd" className={cn("inline-flex items-center justify-center min-w-[20px] h-[18px] px-1 rounded text-[10px] font-mono font-medium bg-(--color-surface-2) text-(--color-fg-muted) border border-(--color-border)", className)} {...props}>
      {children}
    </kbd>
  );
}
```

- [ ] **Step 8: src/components/ui/table.tsx**

```tsx
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table data-slot="table" className={cn("w-full caption-bottom text-[13px]", className)} {...props} />;
}
export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead data-slot="thead" className={cn("sticky top-0 z-10 bg-(--color-bg)", className)} {...props} />;
}
export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody data-slot="tbody" {...props} className={className} />;
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr data-slot="tr" className={cn("border-b border-(--color-border)/60 hover:bg-white/[0.02] transition-colors duration-[120ms]", className)} {...props} />;
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th data-slot="th" className={cn("h-9 px-3 text-left align-middle text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle)", className)} {...props} />;
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td data-slot="td" className={cn("h-10 px-3 align-middle text-(--color-fg)", className)} {...props} />;
}
```

- [ ] **Step 9: src/components/ui/scroll-area.tsx**

```tsx
import { cn } from "@/lib/utils";
export function ScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="scroll-area" className={cn("overflow-auto [scrollbar-gutter:stable] [scrollbar-width:thin]", className)} {...props} />;
}
```

- [ ] **Step 10: src/components/ui/dialog.tsx (Base UI)**

```tsx
"use client";
import { Dialog as Base } from "@base-ui-components/react/dialog";
import { cn } from "@/lib/utils";

export const Dialog = Base.Root;
export const DialogTrigger = Base.Trigger;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof Base.Popup>) {
  return (
    <Base.Portal>
      <Base.Backdrop data-slot="dialog-backdrop" className="fixed inset-0 z-[1050] bg-black/60 backdrop-blur-[2px] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-[180ms]" />
      <Base.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-[1050] w-full max-w-[640px] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-(--color-surface-1) border border-(--color-border) shadow-[0_24px_64px_oklch(0.05_0.008_260/0.6)] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.97] transition-[opacity,transform] duration-[180ms] ease-out",
          className,
        )}
        {...props}
      >
        {children}
      </Base.Popup>
    </Base.Portal>
  );
}
export function DialogTitle({ className, ...props }: React.ComponentProps<typeof Base.Title>) {
  return <Base.Title data-slot="dialog-title" className={cn("text-[18px] font-semibold tracking-tight", className)} {...props} />;
}
export function DialogDescription({ className, ...props }: React.ComponentProps<typeof Base.Description>) {
  return <Base.Description data-slot="dialog-description" className={cn("text-[13px] text-(--color-fg-muted)", className)} {...props} />;
}
export const DialogClose = Base.Close;
```

- [ ] **Step 11: src/components/ui/sheet.tsx (slide-from-right Sheet using Base UI dialog)**

```tsx
"use client";
import { Dialog as Base } from "@base-ui-components/react/dialog";
import { cn } from "@/lib/utils";

export const Sheet = Base.Root;
export const SheetTrigger = Base.Trigger;
export const SheetClose = Base.Close;

export function SheetContent({ className, side = "right", children, ...props }: React.ComponentProps<typeof Base.Popup> & { side?: "right" | "bottom" }) {
  const sideClasses = side === "right"
    ? "right-0 top-0 h-dvh w-full max-w-[480px] data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full"
    : "bottom-0 left-0 right-0 max-h-[90dvh] data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full";
  return (
    <Base.Portal>
      <Base.Backdrop className="fixed inset-0 z-[1040] bg-black/50 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 transition-opacity duration-[180ms]" />
      <Base.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed z-[1040] bg-(--color-surface-1) border-(--color-border) flex flex-col transition-transform duration-[240ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          side === "right" ? "border-l" : "border-t rounded-t-xl",
          sideClasses,
          className,
        )}
        {...props}
      >
        {children}
      </Base.Popup>
    </Base.Portal>
  );
}
export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-header" className={cn("h-12 px-5 flex items-center justify-between border-b border-(--color-border)", className)} {...props} />;
}
export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-body" className={cn("flex-1 overflow-auto px-5 py-4", className)} {...props} />;
}
export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div data-slot="sheet-footer" className={cn("h-14 px-5 flex items-center justify-end gap-2 border-t border-(--color-border)", className)} {...props} />;
}
```

- [ ] **Step 12: src/components/ui/tabs.tsx (Base UI)**

```tsx
"use client";
import { Tabs as Base } from "@base-ui-components/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = Base.Root;
export function TabsList({ className, ...props }: React.ComponentProps<typeof Base.List>) {
  return <Base.List data-slot="tabs-list" className={cn("flex items-center gap-1 border-b border-(--color-border) px-1", className)} {...props} />;
}
export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof Base.Tab>) {
  return <Base.Tab data-slot="tabs-trigger" className={cn("h-9 px-3 text-[13px] text-(--color-fg-muted) data-[selected]:text-(--color-fg) data-[selected]:border-b-2 data-[selected]:border-(--color-accent) -mb-px transition-colors duration-[120ms] cursor-pointer", className)} {...props} />;
}
export function TabsContent({ className, ...props }: React.ComponentProps<typeof Base.Panel>) {
  return <Base.Panel data-slot="tabs-content" className={cn("py-4", className)} {...props} />;
}
```

- [ ] **Step 13: src/components/ui/tooltip.tsx (Base UI)**

```tsx
"use client";
import { Tooltip as Base } from "@base-ui-components/react/tooltip";
import { cn } from "@/lib/utils";

export const TooltipProvider = Base.Provider;
export const Tooltip = Base.Root;
export const TooltipTrigger = Base.Trigger;
export function TooltipContent({ className, children, ...props }: React.ComponentProps<typeof Base.Popup>) {
  return (
    <Base.Portal>
      <Base.Positioner sideOffset={6}>
        <Base.Popup data-slot="tooltip-content" className={cn("rounded-md bg-(--color-surface-3) border border-(--color-border) px-2 py-1 text-[11px] text-(--color-fg) shadow-lg", className)} {...props}>
          {children}
        </Base.Popup>
      </Base.Positioner>
    </Base.Portal>
  );
}
```

- [ ] **Step 14: src/components/ui/command.tsx (cmdk)**

```tsx
"use client";
import { Command as Cmdk } from "cmdk";
import { cn } from "@/lib/utils";

export const Command = Cmdk;
export const CommandInput = Cmdk.Input;
export const CommandList = Cmdk.List;
export const CommandItem = Cmdk.Item;
export const CommandGroup = Cmdk.Group;
export const CommandEmpty = Cmdk.Empty;
export const CommandSeparator = Cmdk.Separator;

export function commandClasses() {
  return {
    root: "flex flex-col bg-(--color-surface-1) rounded-lg overflow-hidden",
    input: "h-12 w-full bg-transparent border-0 border-b border-(--color-border) px-4 text-[14px] text-(--color-fg) outline-none placeholder:text-(--color-fg-subtle)",
    list: "max-h-[400px] overflow-auto p-1",
    item: "flex items-center gap-3 h-9 px-3 rounded-md text-[13px] text-(--color-fg-muted) data-[selected=true]:bg-(--color-accent-soft) data-[selected=true]:text-(--color-fg) cursor-pointer",
    group: "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-(--color-fg-subtle) [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2",
    empty: "py-8 text-center text-[13px] text-(--color-fg-muted)",
  };
}
```

- [ ] **Step 15: Verify all primitives compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 16: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): shadcn Base UI primitives (button, dialog, sheet, tabs, table, card, badge, skeleton, tooltip, input, separator, scroll-area, kbd, command)"
```

---

## Track C — App components (sequential after Track B)

### Task 6 — Sidebar (filters)

**Files:**
- Create: `src/components/app/sidebar.tsx`

**MCP refs:** designer_get_page_template("dashboard") sidebar; DESIGN.md S5 Sidebar.

- [ ] **Step 1: Implement**

```tsx
"use client";
import { Zap, Brain, Wrench, Search, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const { filters, setFilter, resetFilters } = useStore();

  return (
    <aside className="w-[240px] shrink-0 h-dvh sticky top-0 bg-(--color-bg) border-r border-(--color-border) flex flex-col">
      <div className="h-12 flex items-center gap-2 px-4 border-b border-(--color-border)">
        <div className="w-6 h-6 rounded-md bg-(--color-accent) flex items-center justify-center">
          <Zap className="w-3.5 h-3.5 text-(--color-accent-fg)" strokeWidth={2.5} />
        </div>
        <span className="text-[14px] font-semibold tracking-tight">ZeroCostLLM</span>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-5">
        <Section label="Search">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--color-fg-subtle)" />
            <Input value={filters.search} onChange={(e) => setFilter("search", e.target.value)} placeholder="Model id..." className="pl-8" />
          </div>
        </Section>

        <Section label="Tier">
          <Toggle label="Free only" checked={filters.freeOnly} onChange={(v) => setFilter("freeOnly", v)} />
          <Toggle label="Open source" checked={filters.openOnly} onChange={(v) => setFilter("openOnly", v)} />
        </Section>

        <Section label="Capabilities">
          <div className="grid grid-cols-2 gap-1.5">
            <Chip active={filters.brain} onClick={() => setFilter("brain", !filters.brain)}><Brain className="w-3 h-3" />Brain</Chip>
            <Chip active={filters.tools} onClick={() => setFilter("tools", !filters.tools)}><Wrench className="w-3 h-3" />Tools</Chip>
          </div>
        </Section>

        <Section label="Hardware">
          <Slider label="Min Params" suffix="B" value={filters.minParams} max={500} step={1} onChange={(v) => setFilter("minParams", v)} />
          <Slider label="Min Context" suffix="K" value={filters.minCtx} max={1_000_000} step={8000} onChange={(v) => setFilter("minCtx", v)} display={(v) => Math.round(v / 1000)} />
        </Section>
      </div>

      <Separator />
      <div className="p-3">
        <Button variant="ghost" size="sm" onClick={resetFilters} className="w-full justify-start">
          <RotateCcw className="w-3.5 h-3.5" /> Reset filters
        </Button>
      </div>
    </aside>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle) px-1">{label}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-full h-8 px-3 rounded-md flex items-center justify-between hover:bg-(--color-surface-1) transition-colors duration-[120ms] cursor-pointer"
    >
      <span className="text-[13px] text-(--color-fg)">{label}</span>
      <span className={cn("relative inline-flex h-[18px] w-[30px] items-center rounded-full transition-colors duration-[120ms]", checked ? "bg-(--color-accent)" : "bg-(--color-surface-3)")}>
        <span className={cn("inline-block h-3 w-3 rounded-full bg-white transition-transform duration-[120ms]", checked ? "translate-x-[15px]" : "translate-x-[3px]")} />
      </span>
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button" className={cn(
      "h-8 px-2 rounded-md flex items-center justify-center gap-1.5 text-[12px] font-medium transition-colors duration-[120ms] cursor-pointer border",
      active
        ? "bg-(--color-accent-soft) text-(--color-accent) border-(--color-accent)/40"
        : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)",
    )}>{children}</button>
  );
}

function Slider({ label, value, max, step, suffix, onChange, display }: {
  label: string; value: number; max: number; step: number; suffix: string;
  onChange: (v: number) => void; display?: (v: number) => number;
}) {
  const shown = display ? display(value) : value;
  return (
    <div className="space-y-1.5 px-1">
      <div className="flex justify-between text-[11px]">
        <span className="text-(--color-fg-muted)">{label}</span>
        <span className="font-mono text-(--color-accent)">{shown}{suffix}</span>
      </div>
      <input type="range" min={0} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1 accent-(--color-accent) cursor-pointer" />
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/sidebar.tsx
git commit -m "feat(app): sidebar with search/tier/capabilities/hardware filters"
```

---

### Task 7 — Header

**Files:**
- Create: `src/components/app/header.tsx`
- Create: `src/components/app/theme-toggle.tsx`

- [ ] **Step 1: theme-toggle.tsx**

```tsx
"use client";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useStore();
  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
      {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
    </Button>
  );
}
```

- [ ] **Step 2: header.tsx**

```tsx
"use client";
import { Search, Activity } from "lucide-react";
import { useStore } from "@/lib/store";
import { Kbd } from "@/components/ui/kbd";
import { ThemeToggle } from "./theme-toggle";

export function Header({ count }: { count: number }) {
  const { setCmdk } = useStore();
  return (
    <header className="h-12 sticky top-0 z-[1020] bg-(--color-bg)/80 backdrop-blur-md border-b border-(--color-border) flex items-center px-4 gap-4">
      <div className="flex items-baseline gap-2">
        <h1 className="text-[14px] font-semibold tracking-tight">Market</h1>
        <span className="text-[11px] font-mono text-(--color-fg-subtle)">{count} models</span>
      </div>

      <button
        type="button"
        onClick={() => setCmdk(true)}
        className="flex-1 max-w-md mx-auto h-7 flex items-center gap-2 px-2.5 rounded-md bg-(--color-surface-1) border border-(--color-border) text-(--color-fg-subtle) hover:border-(--color-border-strong) transition-colors duration-[120ms] cursor-pointer"
      >
        <Search className="w-3 h-3" />
        <span className="flex-1 text-left text-[12px]">Search models, providers, actions...</span>
        <Kbd>⌘</Kbd><Kbd>K</Kbd>
      </button>

      <div className="flex items-center gap-1">
        <div className="flex items-center gap-1.5 h-7 px-2 rounded-md bg-(--color-surface-1) border border-(--color-border)">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-(--color-success) opacity-60 animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-(--color-success)" />
          </span>
          <span className="text-[10px] font-mono text-(--color-fg-muted)">live</span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/header.tsx src/components/app/theme-toggle.tsx
git commit -m "feat(app): header with cmdk trigger, live pulse, theme toggle"
```

---

### Task 8 — KPI Strip

**Files:**
- Create: `src/components/app/kpi-strip.tsx`

- [ ] **Step 1: Implement**

```tsx
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function KpiStrip({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  const total = models.length;
  const free = models.filter((m) => m.is_free).length;
  const providers = new Set(models.map((m) => m.provider)).size;
  const tpsValues = models.map((m) => m.tps).filter((v): v is number => v != null);
  const bestTps = tpsValues.length ? Math.max(...tpsValues) : 0;
  const sortedCap = [...models].sort((a, b) => a.capability - b.capability);
  const medCap = sortedCap[Math.floor(sortedCap.length / 2)]?.capability ?? 0;

  const items = [
    { label: "Total Models", value: formatNumber(total, 0) },
    { label: "Free Tier", value: formatNumber(free, 0), accent: true },
    { label: "Providers", value: String(providers) },
    { label: "Peak TPS", value: formatNumber(bestTps, 0) },
    { label: "Median Score", value: medCap.toFixed(1) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {items.map((it) => (
        <Card key={it.label} className="px-5 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-(--color-fg-subtle)">{it.label}</div>
          <div className={`mt-1 text-[22px] font-mono font-semibold tabular-nums ${it.accent ? "text-(--color-accent)" : "text-(--color-fg)"}`}>{it.value}</div>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/kpi-strip.tsx
git commit -m "feat(app): KPI strip (total/free/providers/tps/median)"
```

---

### Task 9 — Provider chips

**Files:**
- Create: `src/components/app/provider-chips.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useStore } from "@/lib/store";
import type { ProviderFilter } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROVIDERS: { id: ProviderFilter; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "var(--color-fg-muted)" },
  { id: "openrouter", label: "OpenRouter", dot: "var(--color-provider-openrouter)" },
  { id: "ollama", label: "Ollama", dot: "var(--color-provider-ollama)" },
  { id: "aistudio", label: "AI Studio", dot: "var(--color-provider-aistudio)" },
  { id: "groq", label: "Groq", dot: "var(--color-provider-groq)" },
  { id: "cerebras", label: "Cerebras", dot: "var(--color-provider-cerebras)" },
  { id: "cloudflare", label: "Cloudflare", dot: "var(--color-provider-cloudflare)" },
];

export function ProviderChips() {
  const { filters, setFilter } = useStore();
  return (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
      {PROVIDERS.map((p) => {
        const active = filters.provider === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setFilter("provider", p.id)}
            className={cn(
              "h-7 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-medium border whitespace-nowrap transition-colors duration-[120ms] cursor-pointer",
              active
                ? "bg-(--color-accent-soft) text-(--color-fg) border-(--color-accent)/40"
                : "bg-(--color-surface-1) text-(--color-fg-muted) border-(--color-border) hover:bg-(--color-surface-2)",
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/provider-chips.tsx
git commit -m "feat(app): provider filter chips with status dots"
```

---

### Task 10 — Model Table

**Files:**
- Create: `src/components/app/model-table.tsx`
- Create: `src/components/app/model-table.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { useStore } from "@/lib/store";
import { applyFilters } from "./model-table";
import type { ModelStats } from "@/lib/types";

const M = (overrides: Partial<ModelStats>): ModelStats => ({
  id: "x/y", name: "y", params: 1, ctx: 1, is_free: false,
  capability: 0, brain: false, tools: false, open: false,
  tps: null, uptime: null, provider: "OpenRouter", balanced: 0, value: 0,
  ...overrides,
});

describe("applyFilters", () => {
  beforeEach(() => useStore.getState().resetFilters());

  it("filters by provider=ollama matching by provider field", () => {
    const models = [M({ id: "a", provider: "Ollama" }), M({ id: "b", provider: "Groq" })];
    useStore.getState().setFilter("provider", "ollama");
    expect(applyFilters(models, useStore.getState().filters).map((m) => m.id)).toEqual(["a"]);
  });

  it("freeOnly excludes paid models", () => {
    const models = [M({ id: "a", is_free: true }), M({ id: "b", is_free: false })];
    useStore.getState().setFilter("freeOnly", true);
    expect(applyFilters(models, useStore.getState().filters).map((m) => m.id)).toEqual(["a"]);
  });

  it("search matches model id substring case-insensitive", () => {
    const models = [M({ id: "groq/llama-3" }), M({ id: "openai/gpt-4" })];
    useStore.getState().setFilter("search", "LLAMA");
    expect(applyFilters(models, useStore.getState().filters).map((m) => m.id)).toEqual(["groq/llama-3"]);
  });
});
```

```bash
npx vitest run src/components/app/model-table.test.tsx
```

Expected: FAIL ("applyFilters not exported").

- [ ] **Step 2: Implement**

```tsx
"use client";
import { ChevronUp, ChevronDown, Brain, Wrench, MessageSquare, BookOpen, Lock, Ghost } from "lucide-react";
import { useStore, type SortCol, type Filters } from "@/lib/store";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ModelStats } from "@/lib/types";
import { PROVIDER_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

export function applyFilters(models: ModelStats[], f: Filters): ModelStats[] {
  return models.filter((m) => {
    if (f.freeOnly && !m.is_free) return false;
    if (f.openOnly && !m.open) return false;
    if (f.brain && !m.brain) return false;
    if (f.tools && !m.tools) return false;
    if (f.minParams > 0 && m.params < f.minParams) return false;
    if (f.minCtx > 0 && m.ctx < f.minCtx) return false;
    if (f.search && !m.id.toLowerCase().includes(f.search.toLowerCase())) return false;
    if (f.provider !== "all") {
      const expected = f.provider;
      if (expected === "openrouter") {
        if (Object.keys(PROVIDER_LABEL).includes(m.provider)) return false;
      } else {
        if (PROVIDER_LABEL[m.provider] !== expected) return false;
      }
    }
    return true;
  });
}

export function ModelTable({ models, loading }: { models: ModelStats[]; loading: boolean }) {
  const { sort, setSort, openDrawer, openChat } = useStore();

  if (loading) {
    return (
      <div className="space-y-1">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10" />)}
      </div>
    );
  }

  const sorted = [...models].sort((a, b) => {
    const av = a[sort.col]; const bv = b[sort.col];
    if (av == null && bv == null) return 0;
    if (av == null) return sort.desc ? 1 : -1;
    if (bv == null) return sort.desc ? -1 : 1;
    if (typeof av === "string" && typeof bv === "string") return sort.desc ? bv.localeCompare(av) : av.localeCompare(bv);
    return sort.desc ? Number(bv) - Number(av) : Number(av) - Number(bv);
  });

  if (sorted.length === 0) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center text-(--color-fg-subtle) gap-3">
        <Ghost className="w-8 h-8" />
        <div>
          <div className="text-[14px] font-medium text-(--color-fg-muted)">No models match your filters</div>
          <div className="text-[12px] mt-1 text-center">Try resetting filters in the sidebar</div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-(--color-border) overflow-hidden bg-(--color-surface-1)">
      <Table>
        <THead>
          <TR className="hover:bg-transparent">
            <TH className="w-12 text-right pr-4 font-mono text-[10px]">#</TH>
            <SortHead col="id" label="Model" />
            <TH>Tier</TH>
            <TH>Capabilities</TH>
            <SortHead col="ctx" label="Context" align="right" />
            <SortHead col="tps" label="TPS" align="right" />
            <SortHead col="balanced" label="Score" align="right" highlighted />
            <TH className="w-20 text-center">Action</TH>
          </TR>
        </THead>
        <TBody>
          {sorted.map((m, i) => (
            <TR key={m.id} onClick={() => openDrawer(m.id)} className="cursor-pointer">
              <TD className="text-right pr-4 font-mono text-[11px] text-(--color-fg-subtle)">{i + 1}</TD>
              <TD>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-(--color-surface-2) border border-(--color-border) flex items-center justify-center text-[10px] font-mono font-semibold text-(--color-fg-muted)">
                    {m.params >= 1 ? `${formatParams(m.params)}` : "?"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium truncate">{m.id}</div>
                    <div className="text-[11px] text-(--color-fg-subtle) flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-(--color-fg-subtle)" />
                      {m.provider}
                    </div>
                  </div>
                </div>
              </TD>
              <TD>{m.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>}</TD>
              <TD>
                <div className="flex items-center gap-1.5">
                  {m.brain && <Badge variant="accent"><Brain className="w-2.5 h-2.5" />IQ</Badge>}
                  {m.tools && <Badge variant="info"><Wrench className="w-2.5 h-2.5" />TOOL</Badge>}
                  {m.open ? <BookOpen className="w-3 h-3 text-(--color-fg-subtle)" /> : <Lock className="w-3 h-3 text-(--color-fg-subtle)/40" />}
                </div>
              </TD>
              <TD className="text-right font-mono text-[12px] tabular-nums text-(--color-fg-muted)">{formatCtx(m.ctx)}</TD>
              <TD className="text-right font-mono text-[12px] tabular-nums">
                <span className={m.tps != null ? "text-(--color-warning)" : "text-(--color-fg-disabled) italic"}>
                  {m.tps != null ? m.tps.toFixed(1) : "—"}
                </span>
              </TD>
              <TD className="text-right font-mono text-[13px] font-semibold tabular-nums text-(--color-accent)">{m.balanced.toFixed(1)}</TD>
              <TD className="text-center">
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openChat(m.id); }} aria-label="Open chat">
                  <MessageSquare className="w-3.5 h-3.5" />
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function SortHead({ col, label, align = "left", highlighted = false }: { col: SortCol; label: string; align?: "left" | "right"; highlighted?: boolean }) {
  const { sort, setSort } = useStore();
  const active = sort.col === col;
  return (
    <TH className={cn("cursor-pointer select-none hover:text-(--color-fg)", align === "right" && "text-right", highlighted && "bg-(--color-accent-soft)")} onClick={() => setSort(col)}>
      <span className={cn("inline-flex items-center gap-1", align === "right" && "flex-row-reverse")}>
        {label}
        {active && (sort.desc ? <ChevronDown className="w-3 h-3 text-(--color-accent)" /> : <ChevronUp className="w-3 h-3 text-(--color-accent)" />)}
      </span>
    </TH>
  );
}

function formatParams(b: number): string {
  if (b >= 1000) return `${(b / 1000).toFixed(b % 1000 === 0 ? 0 : 1)}T`;
  return `${b}B`;
}

function formatCtx(c: number): string {
  if (c >= 1_000_000) return `${(c / 1_000_000).toFixed(1)}M`;
  if (c >= 1_000) return `${Math.round(c / 1_000)}K`;
  return String(c);
}
```

- [ ] **Step 3: Verify tests pass**

```bash
npx vitest run src/components/app/model-table.test.tsx
```

Expected: PASS 3/3.

- [ ] **Step 4: Commit**

```bash
git add src/components/app/model-table.tsx src/components/app/model-table.test.tsx
git commit -m "feat(app): sortable model table with row-click drawer + chat action"
```

---

### Task 11 — Detail Drawer

**Files:**
- Create: `src/components/app/detail-drawer.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { X, Copy, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";
import type { ModelStats } from "@/lib/types";
import { useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export function DetailDrawer({ models }: { models: ModelStats[] }) {
  const { drawerModelId, closeDrawer, openChat } = useStore();
  const open = drawerModelId !== null;
  const model = models.find((m) => m.id === drawerModelId);

  if (!open || !model) return null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeDrawer()}>
      <SheetContent>
        <SheetHeader>
          <div className="flex flex-col gap-0.5 min-w-0">
            <div className="text-[14px] font-semibold truncate">{model.id}</div>
            <div className="text-[11px] text-(--color-fg-muted)">{model.provider}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={closeDrawer} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <SheetBody>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Tier" value={model.is_free ? <Badge variant="success">FREE</Badge> : <Badge>PAID</Badge>} />
                <Stat label="Score" value={<span className="font-mono text-(--color-accent) text-[14px] font-semibold">{model.balanced.toFixed(1)}</span>} />
                <Stat label="Params" value={`${model.params}B`} />
                <Stat label="Context" value={`${(model.ctx / 1000).toFixed(0)}K`} />
                <Stat label="TPS" value={model.tps != null ? `${model.tps.toFixed(1)}` : "—"} />
                <Stat label="Uptime" value={model.uptime != null ? `${model.uptime.toFixed(2)}%` : "—"} />
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {model.brain && <Badge variant="accent">Reasoning</Badge>}
                {model.tools && <Badge variant="info">Tool calling</Badge>}
                {model.open && <Badge>Open weights</Badge>}
              </div>
            </TabsContent>

            <TabsContent value="code">
              <CodeBlock label="cURL" code={`curl ${API_BASE}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -d '{"model":"${model.id}","messages":[{"role":"user","content":"hi"}]}'`} />
              <CodeBlock label="Python" code={`from openai import OpenAI
client = OpenAI(base_url="${API_BASE}/v1", api_key="any")
r = client.chat.completions.create(
  model="${model.id}",
  messages=[{"role": "user", "content": "hi"}],
)
print(r.choices[0].message.content)`} />
            </TabsContent>

            <TabsContent value="metrics">
              <div className="text-[13px] text-(--color-fg-muted)">
                Provider: <span className="text-(--color-fg)">{model.provider}</span><br/>
                Capability score: <span className="font-mono text-(--color-fg)">{model.capability.toFixed(2)}</span><br/>
                Value index: <span className="font-mono text-(--color-fg)">{model.value.toLocaleString()}</span>
              </div>
            </TabsContent>
          </Tabs>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" onClick={closeDrawer}>Close</Button>
          <Button onClick={() => { openChat(model.id); closeDrawer(); }}>
            <ExternalLink className="w-3.5 h-3.5" /> Open in chat
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-(--color-surface-2) px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</div>
      <div className="mt-1 text-[13px] text-(--color-fg)">{value}</div>
    </div>
  );
}

function CodeBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-(--color-fg-subtle) font-semibold">{label}</span>
        <Button variant="ghost" size="sm" onClick={onCopy}>
          <Copy className="w-3 h-3" /> {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="rounded-md bg-(--color-surface-2) border border-(--color-border) p-3 overflow-x-auto text-[12px] font-mono text-(--color-fg) leading-relaxed">{code}</pre>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/detail-drawer.tsx
git commit -m "feat(app): detail drawer (Sheet) with overview/code/metrics tabs"
```

---

### Task 12 — Command Palette

**Files:**
- Create: `src/components/app/command-palette.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Command, CommandInput, CommandList, CommandItem, CommandGroup, CommandEmpty, commandClasses } from "@/components/ui/command";
import { Kbd } from "@/components/ui/kbd";
import type { ModelStats } from "@/lib/types";
import { MessageSquare, Eye, Filter } from "lucide-react";

export function CommandPalette({ models }: { models: ModelStats[] }) {
  const { cmdkOpen, setCmdk, openDrawer, openChat, setFilter, resetFilters } = useStore();
  const cls = commandClasses();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdk(!cmdkOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmdkOpen, setCmdk]);

  return (
    <Dialog open={cmdkOpen} onOpenChange={setCmdk}>
      <DialogContent className="p-0 max-w-[640px]">
        <Command className={cls.root} loop>
          <CommandInput placeholder="Search models, providers, actions..." className={cls.input} />
          <CommandList className={cls.list}>
            <CommandEmpty className={cls.empty}>No matches.</CommandEmpty>

            <CommandGroup heading="Actions" className={cls.group}>
              <CommandItem className={cls.item} onSelect={() => { resetFilters(); setCmdk(false); }}>
                <Filter className="w-3.5 h-3.5" /> Reset all filters
              </CommandItem>
              <CommandItem className={cls.item} onSelect={() => { setFilter("freeOnly", true); setCmdk(false); }}>
                <Filter className="w-3.5 h-3.5" /> Show free models only
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Models" className={cls.group}>
              {models.slice(0, 30).map((m) => (
                <CommandItem key={m.id} className={cls.item} value={m.id} onSelect={() => { openDrawer(m.id); setCmdk(false); }}>
                  <Eye className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{m.id}</span>
                  <span className="text-[10px] font-mono text-(--color-fg-subtle)">{m.provider}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Chat with..." className={cls.group}>
              {models.slice(0, 10).map((m) => (
                <CommandItem key={`chat-${m.id}`} className={cls.item} value={`chat ${m.id}`} onSelect={() => { openChat(m.id); setCmdk(false); }}>
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="flex-1 truncate">{m.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <div className="h-9 border-t border-(--color-border) px-3 flex items-center justify-end gap-3 text-[10px] text-(--color-fg-subtle)">
            <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
            <span className="flex items-center gap-1"><Kbd>↵</Kbd> select</span>
            <span className="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/app/command-palette.tsx
git commit -m "feat(app): Cmd+K command palette (models, actions, chat shortcuts)"
```

---

### Task 13 — Chat Sheet (replaces ChatModal)

**Files:**
- Modify: `src/components/ChatModal.tsx` → delete after migration
- Create: `src/components/app/chat-sheet.tsx`

- [ ] **Step 1: Implement**

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { Send, X, Bot, User } from "lucide-react";
import axios from "axios";
import { Sheet, SheetContent, SheetHeader, SheetBody } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
type Msg = { role: "user" | "assistant"; content: string };

export function ChatSheet() {
  const { chatModelId, closeChat } = useStore();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatModelId) {
      setMessages([{ role: "assistant", content: `Connected to **${chatModelId}**. Send a message to begin.` }]);
    } else {
      setMessages([]);
      setInput("");
    }
  }, [chatModelId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  if (!chatModelId) return null;

  const send = async () => {
    if (!input.trim() || loading) return;
    const next: Msg = { role: "user", content: input };
    setMessages((p) => [...p, next]);
    setInput("");
    setLoading(true);
    try {
      const r = await axios.post(`${API_BASE}/v1/chat/completions`, {
        model: chatModelId,
        messages: [...messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0), next],
      });
      setMessages((p) => [...p, { role: "assistant", content: r.data.choices[0].message.content }]);
    } catch (err: unknown) {
      let detail = "Request failed.";
      if (axios.isAxiosError(err)) {
        const apiErr = err.response?.data?.detail ?? err.response?.data?.error ?? err.message;
        detail = typeof apiErr === "string" ? apiErr : (apiErr?.message ?? err.message);
        if (err.response?.status) detail = `${err.response.status} ${detail}`;
      } else if (err instanceof Error) detail = err.message;
      setMessages((p) => [...p, { role: "assistant", content: `**Error:** ${detail}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={!!chatModelId} onOpenChange={(v) => !v && closeChat()}>
      <SheetContent className="max-w-[560px]">
        <SheetHeader>
          <div className="flex items-center gap-2 min-w-0">
            <Bot className="w-4 h-4 text-(--color-accent)" />
            <span className="text-[13px] font-mono truncate">{chatModelId}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={closeChat} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </SheetHeader>

        <SheetBody className="!p-0 flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" && "flex-row-reverse")}>
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                  m.role === "user" ? "bg-(--color-accent)" : "bg-(--color-surface-2) border border-(--color-border)",
                )}>
                  {m.role === "user" ? <User className="w-3 h-3 text-(--color-accent-fg)" /> : <Bot className="w-3 h-3 text-(--color-fg-muted)" />}
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-lg px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap",
                  m.role === "user" ? "bg-(--color-accent-soft) text-(--color-fg)" : "bg-(--color-surface-2) text-(--color-fg)",
                )}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2 text-(--color-fg-subtle) text-[12px] items-center">
                <Bot className="w-3 h-3" />
                <span className="inline-flex gap-0.5">
                  <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
                  <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:0.2s]" />
                  <span className="w-1 h-1 rounded-full bg-current animate-pulse [animation-delay:0.4s]" />
                </span>
              </div>
            )}
          </div>

          <div className="border-t border-(--color-border) p-3 flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Type message... (Enter to send, Shift+Enter newline)"
              rows={1}
              className="flex-1 resize-none bg-(--color-surface-1) border border-(--color-border) rounded-md px-3 py-2 text-[13px] outline-none focus:border-(--color-accent) max-h-[120px]"
              disabled={loading}
            />
            <Button onClick={send} disabled={loading || !input.trim()} aria-label="Send">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Delete legacy ChatModal**

```bash
git rm src/components/ChatModal.tsx
```

- [ ] **Step 3: Commit**

```bash
git add src/components/app/chat-sheet.tsx
git commit -m "feat(app): chat sheet replaces ChatModal (typing indicator, error surfacing)"
```

---

## Track D — Page assembly + cleanup

### Task 14 — Page shell + remove old ModelTable

**Files:**
- Modify: `src/app/page.tsx`
- Delete: `src/components/ModelTable.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
"use client";
import useSWR from "swr";
import axios from "axios";
import { useStore } from "@/lib/store";
import { Sidebar } from "@/components/app/sidebar";
import { Header } from "@/components/app/header";
import { KpiStrip } from "@/components/app/kpi-strip";
import { ProviderChips } from "@/components/app/provider-chips";
import { ModelTable, applyFilters } from "@/components/app/model-table";
import { DetailDrawer } from "@/components/app/detail-drawer";
import { CommandPalette } from "@/components/app/command-palette";
import { ChatSheet } from "@/components/app/chat-sheet";
import type { ModelStats } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const fetcher = async (url: string) => (await axios.get<ModelStats[]>(url)).data;

export default function Page() {
  const { filters } = useStore();
  const { data: models = [], isLoading } = useSWR(`${API_BASE}/v1/rankings`, fetcher, { revalidateOnFocus: false });
  const filtered = applyFilters(models, filters);

  return (
    <div className="flex min-h-dvh bg-(--color-bg) text-(--color-fg)">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header count={filtered.length} />
        <main className="flex-1 overflow-auto p-6">
          <KpiStrip models={filtered} loading={isLoading} />
          <ProviderChips />
          <ModelTable models={filtered} loading={isLoading} />
        </main>
      </div>
      <DetailDrawer models={models} />
      <CommandPalette models={models} />
      <ChatSheet />
    </div>
  );
}
```

- [ ] **Step 2: Delete legacy ModelTable**

```bash
git rm src/components/ModelTable.tsx
```

- [ ] **Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(app): assemble new dashboard shell, drop legacy daisyui surfaces"
```

---

### Task 15 — Smoke test in browser

**Files:** none (verification only)

- [ ] **Step 1: Start dev**

```bash
python3 dev.py &
sleep 6
```

- [ ] **Step 2: Verify rankings load**

```bash
curl -s http://localhost:3000 -o /dev/null -w "ui=%{http_code}\n"
curl -s http://localhost:8000/v1/rankings | head -c 80
```

Expected: ui=200, rankings JSON.

- [ ] **Step 3: Check console for hydration errors**

Open browser, DevTools console. Expected: no errors. Open Cmd+K, drawer, chat. Expected: works.

- [ ] **Step 4: Commit smoke fix if any (no commit if clean)**

---

### Task 16 — Anti-pattern + a11y audit (per DESIGN.md S10)

**Files:** none (audit pass)

Verify each in actual code:

- [ ] No `bg-` with raw hex (`grep -r "bg-\[#" src/`) — should be empty
- [ ] All interactive have `cursor-pointer` or are `<button>`
- [ ] All `<button>` have `aria-label` if icon-only
- [ ] `prefers-reduced-motion` block present in `globals.css`
- [ ] No `framer-motion` imports (`grep -r "framer-motion" src/`) — empty
- [ ] No `daisyui` classes (`grep -rE "btn-|bg-base-|text-base-content" src/`) — empty
- [ ] Touch targets: buttons ≥ 32px height (h-7/h-8/h-9 only)
- [ ] All Lucide icons strokeWidth default (no emojis)

```bash
grep -r "bg-\[#" src/ ; grep -r "framer-motion" src/ ; grep -rE "btn-|bg-base-|text-base-content" src/
```

Expected: all empty.

- [ ] Commit nothing or fixes only.

---

### Task 17 — Ship-gate

Run final verification per `hyperstack:ship-gate`.

```bash
npx tsc --noEmit
npx vitest run
docker compose down 2>/dev/null
python3 dev.py &
sleep 8
curl -s http://localhost:3000 -o /dev/null -w "ui=%{http_code}\n"
curl -s http://localhost:8000/v1/rankings | python3 -c "import sys,json; d=json.load(sys.stdin); print('models=', len(d))"
```

Expected: tsc clean, vitest PASS, ui=200, rankings has > 100 models.

---

## Self-Review

- ✅ Spec coverage: every DESIGN.md S5 component → task. KPI strip = T8. Drawer = T11. Cmd+K = T12. Chat = T13. Theme toggle = T7.
- ✅ No placeholders: all task code blocks complete, no "TBD"/"similar to"/"add later".
- ✅ MCP verification: shadcn_get_rules cited per primitive (T5). designer_get_page_template cited per layout decision. design system tokens trace to DESIGN.md S2-S7.
- ✅ Type consistency: `ModelStats` in `lib/types.ts`, `Filters` in `lib/store.ts`, used identically across all tasks.
- ✅ Step atomicity: each step is a single file edit + verify + commit. No "implement entire X" steps.

## Execution

Plan saved to `docs/plans/2026-05-02-ui-overhaul-linear.md`.

Three execution options:
1. **Autonomous** — full end-to-end, stop only on failure
2. **Subagent-driven** (`hyperstack:subagent-ops`) — fresh agent per task, two-stage review (user picked this)
3. **Inline with checkpoints**

User chose **subagent-ops**. Proceeding with that.
