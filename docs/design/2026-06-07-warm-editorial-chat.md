# DESIGN.md — Warm Editorial (Chat surface)

**Personality:** warm-editorial (Notion / Medium / Airbnb) · **Mode:** light · **Density:** comfortable
**Scope (this phase):** the chat surface (`/`) only. Models market + archive keep the current Linear theme until their phase. Applied via a `.theme-editorial` wrapper so the two coexist cleanly.
**Replaces nothing yet** — existing `DESIGN.md` (Linear) stays authoritative for un-migrated surfaces.

## 1. Theme & atmosphere
"Talking to a model should feel like writing in a well-made notebook, not staring into a terminal." Calm, warm, readable, considered. The UI recedes; the conversation is the hero.

## 2. Color (OKLCH, warm-tinted — no cold grey, no pure black/white)
```
--color-bg            oklch(0.98 0.012 78)   warm cream
--color-surface-1     oklch(0.96 0.012 78)
--color-surface-2     oklch(0.93 0.014 78)
--color-surface-3     oklch(0.90 0.016 78)
--color-fg            oklch(0.20 0.008 56)   warm near-black
--color-fg-muted      oklch(0.44 0.012 56)
--color-fg-subtle     oklch(0.58 0.012 60)
--color-border        oklch(0.89 0.012 78)
--color-accent        oklch(0.58 0.14 40)    terracotta  (adjustable)
--color-accent-soft   oklch(0.93 0.045 50)
--color-accent-fg     oklch(0.99 0.01 80)
--color-success       oklch(0.55 0.09 150)   sage
--color-warning       oklch(0.70 0.12 75)    amber
--color-danger        oklch(0.55 0.16 25)
--color-danger-soft   oklch(0.94 0.04 25)
```
Accent = terracotta (not Airbnb coral, not AI purple). One high-chroma accent, rest muted. Separate `--chart-*` later.

## 3. Typography
- **Headings / greeting:** `Lora` (serif), weight 600-700, tracking -0.01em.
- **Body / UI:** `Plus Jakarta Sans` (humanist sans), 16px UI / **18px chat prose**.
- **Code:** keep `Geist Mono`.
- Line-height: **1.7 for chat messages** (prose), 1.5 for UI chrome, 1.15 display.
- Scale 1.25: 13 · 14 · 16 · 18 · 23 · 28 · 35. Max 2 families + mono.

## 4. Spacing — comfortable
4px grid. Chat column `max-w-[680px]`, prose `65ch`. Message vertical rhythm 24px. Card padding 20-24px. Radius **16px** (bubbles 18px, inputs 14px).

## 5. Components (chat)
| Element | Spec |
|---|---|
| Greeting | Lora 28px, warm-fg, generous; subtitle muted |
| User msg | accent-soft bubble, rounded-[18px], right-aligned, 16px |
| Assistant | **no bubble** — prose on bg, 65ch, 18px/1.7, reads like an article; markdown + mono code blocks w/ copy |
| Avatars | soft 28px rounded, warm surface (assistant) / accent (user) |
| Input | surface-1, rounded-[14px], comfortable pad, 2px terracotta focus ring |
| Send / Stop | accent button / outline stop; loading + disabled states |
| Suggestions | warm cards, rounded-16, hover = subtle warm shadow lift |
| Typing | 3 warm dots, gentle pulse |
| Sidebar | cream, warm borders, Lora section labels |

All states: hover, focus(2px ring), active, disabled(0.5 + none), loading. Touch ≥44px.

## 6. Motion
200-250ms, ease-in-out, gentle, no bounce. Animate transform/opacity only. Streaming text appends (no layout jank). `prefers-reduced-motion: reduce` honored with `!important`.

## 7. Elevation
Light mode → warm soft shadows, not borders, for grouping. `--shadow-card: 0 4px 14px oklch(0.22 0.006 56 / 0.06)`. Existing z-index scale kept.

## 8. Do / Don't (this product)
- DO keep streaming <100ms first token, typing indicator, code copy buttons (AI-chat must-haves).
- DO warm near-black on cream (irradiation: no pure #000 on #FFF).
- DON'T use AI purple, cold grey `#F9FAFB`, 1.75 line-height on UI chrome (prose only), emojis as icons, borders-as-noise.
- DON'T invert to make a dark variant — redesign separately if needed.

## 9. Responsive
375 / 768 / 1024 / 1280. Chat column fluid → `max-w-[680px]` centered. Sidebar collapses under 768. `min-h-dvh`. No horizontal scroll.

## 10. Anti-patterns this passes
No #6366F1 · no cold grey bg · weight contrast (Lora 700 / body 400) · warm neutrals committed · near-black/near-white · 4px grid · 65ch prose · all states · reduced-motion · semantic HTML · ≥44px targets.
