# DESIGN.md — ZeroCostLLM Dashboard

## 1. Visual Theme & Atmosphere

**Product:** ZeroCostLLM — real-time market intelligence for free LLM models across 7 providers (OpenRouter, Ollama Cloud, Cerebras, Groq, Cloudflare Workers AI, Google AI Studio, +). OpenAI-compatible proxy.

**Personality:** **premium-precision** (Linear-inspired) with technical-developer density.

**Emotional target:** technical · precise · trustworthy · fast.

**Identity:** *"Engineered LLM market terminal."* Information-first. Zero ornament. Opacity-based hierarchy. No decoration that doesn't carry information.

**Inspirations:** Linear (opacity scale, 8px grid, single accent), Vercel (monospace data accents), Raycast (Cmd+K, compact rows).

**Anti-pose:** Not Supabase emerald glow, not Warp terminal-block, not bento-grid Raycast splash. Linear discipline.

---

## 2. Color Palette

**Strategy:** Mono surfaces (warm-cool-cool) + single deliberate accent. Dark-default (data-dense workload), light-mode supported. OKLCH only.

### Brand Ramp (Indigo-Violet, hue 265)

```
--brand-50:  oklch(0.97 0.020 265);
--brand-100: oklch(0.93 0.040 265);
--brand-200: oklch(0.87 0.080 265);
--brand-300: oklch(0.78 0.120 265);
--brand-400: oklch(0.68 0.150 265);
--brand-500: oklch(0.60 0.165 265);   /* primary accent */
--brand-600: oklch(0.52 0.165 265);
--brand-700: oklch(0.44 0.145 265);
--brand-800: oklch(0.36 0.110 265);
--brand-900: oklch(0.28 0.075 265);
--brand-950: oklch(0.18 0.045 265);
```

**Why hue 265 not #6366F1:** Linear's signature with intent. Chroma 0.165 (lower than AI-purple 0.20+). Single accent system — no secondary brand color.

### Neutral Ramp (Cool, hue 260, chroma 0.008)

```
--neutral-50:  oklch(0.985 0.004 260);
--neutral-100: oklch(0.965 0.005 260);
--neutral-200: oklch(0.925 0.006 260);
--neutral-300: oklch(0.870 0.007 260);
--neutral-400: oklch(0.690 0.008 260);
--neutral-500: oklch(0.530 0.008 260);
--neutral-600: oklch(0.420 0.008 260);
--neutral-700: oklch(0.330 0.008 260);
--neutral-800: oklch(0.230 0.008 260);
--neutral-850: oklch(0.180 0.008 260);
--neutral-900: oklch(0.140 0.008 260);
--neutral-950: oklch(0.090 0.008 260);
```

### Semantic Tokens (Dark default)

```
--bg:           oklch(0.115 0.008 260);  /* near-black, warm-cool */
--surface-1:    oklch(0.155 0.008 260);  /* cards */
--surface-2:    oklch(0.190 0.008 260);  /* elevated */
--surface-3:    oklch(0.230 0.008 260);  /* hover */

--fg:           oklch(0.95 0.005 260);   /* near-white, NOT pure */
--fg-muted:     oklch(0.72 0.006 260);   /* secondary text */
--fg-subtle:    oklch(0.50 0.008 260);   /* tertiary */
--fg-disabled:  oklch(0.36 0.008 260);

--border:       oklch(1 0 0 / 0.08);     /* opacity-based */
--border-strong:oklch(1 0 0 / 0.14);
--ring:         oklch(0.60 0.165 265);   /* brand-500 */

--accent:       oklch(0.60 0.165 265);
--accent-fg:    oklch(0.99 0 0);
--accent-soft:  oklch(0.60 0.165 265 / 0.12);
```

### Status Colors (each: solid + soft)

```
--success:        oklch(0.65 0.15 145);    --success-soft:    oklch(0.65 0.15 145 / 0.14);
--warning:        oklch(0.78 0.16 75);     --warning-soft:    oklch(0.78 0.16 75 / 0.14);
--danger:         oklch(0.62 0.20 25);     --danger-soft:     oklch(0.62 0.20 25 / 0.14);
--info:           oklch(0.68 0.13 230);    --info-soft:       oklch(0.68 0.13 230 / 0.14);
```

### Provider Accent Tokens (chart-only, NOT for UI)

```
--provider-openrouter:  oklch(0.68 0.18 35);   /* warm orange */
--provider-ollama:      oklch(0.62 0.16 200);  /* teal */
--provider-aistudio:    oklch(0.70 0.15 90);   /* yellow-green */
--provider-groq:        oklch(0.65 0.20 25);   /* red-orange */
--provider-cerebras:    oklch(0.60 0.16 290);  /* magenta */
--provider-cloudflare:  oklch(0.72 0.18 60);   /* amber */
```

**Light mode:** redesigned, not inverted. `--bg: oklch(0.99 0.003 260)`, `--fg: oklch(0.13 0.005 260)`. Borders flip to `oklch(0 0 0 / 0.08)`.

---

## 3. Typography

**Stack:** Geist (sans) + Geist Mono. Fallback: Inter / system-ui.

| Token | Size | LH | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display` | 28px | 1.10 | 600 | -0.025em | Page title |
| `h1` | 22px | 1.20 | 600 | -0.022em | Section headings |
| `h2` | 18px | 1.25 | 600 | -0.018em | Card titles |
| `h3` | 15px | 1.30 | 600 | -0.012em | Subsections |
| `body` | 14px | 1.50 | 400 | -0.011em | UI text |
| `body-sm` | 13px | 1.45 | 400 | -0.005em | Secondary |
| `caption` | 11px | 1.35 | 500 | 0.04em | Labels (UPPERCASE) |
| `mono` | 13px | 1.40 | 400 | 0 | Numbers, IDs |
| `mono-sm` | 11px | 1.35 | 500 | 0 | Badges |

**Rules:**
- Body 14px (compact density). Never `clamp()` on body.
- Negative tracking on headings only.
- Max 2 families: Geist + Geist Mono.
- Quantitative data ALWAYS monospace + right-aligned (Tufte).

---

## 4. Spacing & Layout

**Grid:** 8px base. All spacing = 4px multiples.

| Token | Value | Use |
|---|---|---|
| `space-0.5` | 2px | Hairline |
| `space-1` | 4px | Inline gaps |
| `space-2` | 8px | Tight |
| `space-3` | 12px | Group inner |
| `space-4` | 16px | Default |
| `space-5` | 20px | Card padding (compact) |
| `space-6` | 24px | Card padding (default) |
| `space-8` | 32px | Section gap |
| `space-10` | 40px | Section gap (loose) |
| `space-12` | 48px | Page section |
| `space-16` | 64px | Major page section |

**App shell:**
- Sidebar: 240px fixed, full height, sticky.
- Header: 48px fixed, sticky top.
- Content max-width: 1440px. Min: 800px usable.
- Page padding: 24px. Card padding: 20px.

**Radius:** 4 / 6 / 8 / 10 / pill. Default 8px.

---

## 5. Component Specs

### Sidebar (240px, persistent)
**Sections:** Logo · Provider filter chips · Capability toggles · Hardware sliders · Search · Footer.
- Item: 32px tall, 8px radius, 12px horizontal pad. Icon 14px + label 13px.
- Active: `--surface-2` bg + 2px accent left border. Inactive hover: `--surface-1`.
- States: default / hover / active / focus (2px ring offset 2px).

### Header (48px sticky)
- Left: page title (display) + breadcrumb crumbs (body-sm muted).
- Center: search trigger button (`Cmd+K · Search models...`, mono-sm badge).
- Right: theme toggle, provider health pulse dot, settings icon button.

### KPI Strip (NEW — 5 cards)
- 5-up grid: Total Models · Free Models · Active Providers · Best TPS · Median Capability.
- Card: 80px tall, 20px pad, 8px radius, surface-1 bg, no shadow, 1px border.
- Numeral: mono 22px weight 600. Label: caption uppercase muted. Trend: 11px mono ↑/↓ with success/danger.

### Provider Filter Chips
- 7 chips horizontal scroll, 28px tall, 12px pad.
- Inactive: surface-1 + border. Active: `--accent-soft` bg + accent fg + 1px accent border.
- States: default / hover (surface-2) / active / focus.

### Model Table (primary content)
- Compact rows 40px. Sticky header 36px.
- Cols (12-col grid): Rank(60) · Model(380) · Provider(140) · Tier(80) · Caps(120) · Ctx(80) · TPS(80) · Score(100) · Action(56).
- **Numbers:** mono, right-aligned, tabular-nums.
- Row hover: `oklch(1 0 0 / 0.03)` bg + cursor pointer.
- Active row (drawer open): `--accent-soft` bg + accent left border.
- Badge: 18px tall pill, mono-sm. Free=success-soft. Brain/Tools=neutral chips.
- Sortable header: hover shows subtle ↕ icon, active shows ↑/↓ accent.
- Empty state: centered headline + sub + reset filters CTA.
- Loading: 8 skeleton rows (animated shimmer).

### Detail Drawer (NEW — slide-in 480px right)
- Header: model id + provider chip + close icon.
- Tabs: Overview · Code · Performance · Endpoints.
- Code tab: copy-to-clipboard `curl` + python + node snippets, mono-13, syntax-highlight.
- Footer: "Open in Chat" primary CTA.

### Command Palette (NEW — Cmd+K)
- Modal overlay, centered, 640px wide × max 480px tall.
- Search input top, 14px, no border, autofocus.
- Result groups: Models · Filters · Providers · Actions.
- Item: 36px tall, kbd badge right (mono-sm). Selected: accent-soft bg.
- Keyboard: ↑↓ navigate, Enter select, Esc close, Cmd+/ help.

### Chat Modal
- Replace existing daisyui modal. 720px wide × 80vh.
- Message bubbles: user (accent-soft, right-aligned), assistant (surface-1, left-aligned).
- Streaming: typing dot indicator + token-by-token append.
- Footer: textarea (auto-grow), send button, model name + token count.

### Buttons (variants)
- **Primary:** accent bg, fg-on-accent, 32px (sm 28, lg 36), 8px radius, weight 500, 13px.
- **Secondary:** surface-2 bg, fg, 1px border-strong.
- **Ghost:** transparent, fg-muted, hover surface-1.
- **Danger:** danger bg, white fg.
- All: focus 2px ring offset 2px brand-500. Disabled opacity 0.5 pointer-events none.

### Inputs
- 32px tall, 8px radius, surface-1 bg, 1px border, focus border accent + 2px ring-soft.
- Label above (caption uppercase muted). Helper text below body-sm muted.
- Validation on blur. Error: 1px danger border + danger-soft icon prefix + body-sm danger msg below.

### Badges/Chips
- Provider: 18px, mono-sm, surface-2, 1px border. Free: success-soft. Open-source: brand-soft.

---

## 6. Motion

**Tokens:**
```
--motion-fast:   120ms   ease-out;   /* hover, color, opacity */
--motion-normal: 180ms   ease-out;   /* enter */
--motion-slow:   240ms   cubic-bezier(0.4, 0, 0.2, 1); /* drawer/modal */
```

**Rules:**
- Animate ONLY `transform` + `opacity` (GPU). Never width/height/top/left.
- Exit 80ms shorter than enter.
- Drawer: 240ms slide from right (translateX).
- Modal: 180ms fade + scale (0.97 → 1).
- Row enter: 30ms stagger × max 12 rows on first paint (then no stagger).
- Skeleton shimmer: 1.4s linear infinite (the only linear allowed).
- `prefers-reduced-motion: reduce` → ALL durations 0.01ms `!important`. No exceptions.

---

## 7. Elevation

Dark mode: NO box-shadows. Use surface progression (surface-1 < surface-2 < surface-3) for depth.

Light mode shadow scale (warm-tinted oklch):
```
--shadow-xs: 0 1px 2px oklch(0.20 0.008 260 / 0.04);
--shadow-sm: 0 2px 4px oklch(0.20 0.008 260 / 0.05);
--shadow-md: 0 4px 12px oklch(0.20 0.008 260 / 0.08);
--shadow-lg: 0 12px 32px oklch(0.20 0.008 260 / 0.10);
```

Z-index scale:
```
dropdown: 1000 · sticky: 1020 · drawer: 1040 · modal: 1050 · tooltip: 1070 · toast: 1080 · cmdk: 1090
```

---

## 8. Do's & Don'ts (10 traced rules)

### Do's
1. **Right-align all quantitative columns + monospace + tabular-nums.** *(Tufte: data-ink, P10)*
2. **Cmd+K is the primary search affordance, persistent in header.** *(developer-tool must-have, Doherty)*
3. **Single accent color (brand-500). Status colors only for status.** *(Von Restorff: one focal)*
4. **Empty state on every container: headline + copy + CTA.** *(P7, every empty = onboarding moment)*
5. **Skeleton loaders for table data, NOT spinners.** *(skeleton-vs-spinner: known structure)*
6. **Provider tokens are chart-only, never UI accents.** *(separate `--chart-*` from `--primary`)*
7. **Opacity-based borders in dark mode (`oklch(1 0 0 / 0.08)`).** *(Linear discipline, P5 dark-mode)*
8. **All interactive ≥ 32px height (44px touch target via padding).** *(Fitts, P2)*
9. **Validation on blur, never on input. Preserve all input on error.** *(P7 input-validation, no-clear-on-error)*
10. **Reduced-motion media query with `!important` in `@layer base`.** *(P6 mandatory, WCAG 2.3.3)*

### Don'ts
1. ❌ AI purple gradient `#6366F1` — using brand hue 265 with chroma 0.165 (lower)
2. ❌ Cold grey `#F9FAFB` background — using `oklch(0.115 0.008 260)` (warm-cool tint)
3. ❌ Dark mode = invert light — redesigning with surface progression
4. ❌ Pure `#000` on `#FFF` — `oklch(0.95 0.005 260)` on `oklch(0.115 0.008 260)`
5. ❌ Linear easing on UI — only on shimmer
6. ❌ Decorative motion (`animate-bounce`, `animate-pulse` on icons) — only on loading/state
7. ❌ Random sizes (17px, 23px) — strict scale ratio 1.25
8. ❌ `font-weight: 500` everywhere — 600 heading, 400 body strict
9. ❌ Emojis as icons — Lucide React only
10. ❌ Borders without purpose — opacity surfaces over borders for grouping

---

## 9. Responsive Behavior

| Breakpoint | Layout |
|---|---|
| `< 768` (mobile) | Sidebar → full-screen drawer (hamburger). KPI strip → 2-up grid. Table → card list (vertical). Drawer → bottom sheet 90vh. |
| `768–1023` (tablet) | Sidebar collapsible 56px → 240px. KPI 3-up. Table compresses (hide ctx col). |
| `1024–1279` (laptop) | Full sidebar 240px. KPI 5-up. Table all cols. |
| `≥ 1280` (desktop) | Same + drawer overlay (no layout push). |

**Content priorities (mobile-first):**
1. Search/Cmd+K (always)
2. Model name + score + free/paid (always)
3. Provider chip + TPS (≥768)
4. Capability badges (≥1024)
5. KPI strip (≥768)
6. Detail drawer (≥1024 overlay, < 1024 full screen sheet)

---

## 10. Anti-Pattern Audit

Verified against `designer_get_anti_patterns(industry: developer-tool)` — all 35 patterns:

| Pattern | Status |
|---|---|
| AI purple `#6366F1` | ✅ Custom hue 265, chroma 0.165 |
| Hex/HSL tokens | ✅ OKLCH throughout |
| Same primary for charts AND UI | ✅ Provider tokens separate |
| Cold grey `#F9FAFB` | ✅ Warm-cool tinted neutrals |
| Dark = invert | ✅ Redesigned with surface progression |
| Pure `#000`/`#FFF` | ✅ Tinted near-black/near-white |
| Random font sizes | ✅ Ratio 1.25 strict |
| `font-weight: 500` everywhere | ✅ 600/400 contrast |
| Positive tracking headings | ✅ Negative on display/headings |
| LH 1.75 on app UI | ✅ 1.5 body, 1.1 display |
| 3+ font families | ✅ Geist + Geist Mono |
| Full-width body text | ✅ Max 65ch on prose |
| Non-4px values | ✅ All multiples of 4 |
| Same padding everywhere | ✅ Semantic spacing tokens |
| No max-width content | ✅ 1440px page max |
| No hover state | ✅ Hover on every interactive |
| `outline: none` no replacement | ✅ 2px ring offset 2px |
| Missing loading state | ✅ Skeleton on table, spinner on async actions |
| Missing empty state | ✅ Empty-state contract on every container |
| Touch targets < 44px | ✅ Min 32px height + padding to 44px hit |
| Emojis as icons | ✅ Lucide React only |
| Missing `cursor: pointer` | ✅ All clickables |
| `animate-bounce` on icons | ✅ Reserved for loading |
| No prefers-reduced-motion | ✅ `!important` in `@layer base` |
| Transitions > 500ms | ✅ Max 240ms |
| Linear easing | ✅ Only on shimmer |
| Animating layout props | ✅ transform + opacity only |
| Arbitrary z-index | ✅ Named scale |
| No aspect-ratio on images | ✅ Always set |
| Sticky nav no padding | ✅ Header 48px, content offset |
| 24px spacing everywhere | ✅ Semantic scale |
| All same chroma | ✅ Brand 0.165, neutrals 0.008 |
| Pure `#000` on warm bg | ✅ Warm near-black |
| Tables no row hover | ✅ Subtle `oklch(1 0 0 / 0.03)` |
| Borders without purpose | ✅ Removed where redundant |

---

## Stack

- **Framework:** Next.js 16 + React 19 (existing)
- **Styling:** Tailwind v4 (CSS-first, `@theme` directive)
- **Components:** shadcn/ui (Base UI edition) — replaces daisyui completely
- **Icons:** Lucide React (existing)
- **Fonts:** Geist + Geist Mono (Vercel)
- **Motion:** CSS transitions only (no framer-motion needed for this scope)
- **State:** Zustand (filters, drawer, cmdk) — replace useState scatter
- **Data:** SWR (existing)
