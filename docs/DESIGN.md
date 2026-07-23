# Awano — Design Guide

|                   |                                               |
| ----------------- | --------------------------------------------- |
| **Version**       | 0.3                                           |
| **Last updated**  | 2026-07-23                                    |
| **Aesthetic ref** | tokuty.jp — clean, light, generous whitespace |
| **Primary**       | Amber `#F59E0B` (Tailwind amber-500)          |

---

## Principles

1. **Themed, not hard-coded.** Every colour is a semantic token (`surface`, `fg`, `border`, …) that
   resolves per theme. The app ships light and dark; a surface must never reach for a raw
   `zinc-*` / `white` class. Light stays the default and the design's reference point.
2. **Sparse accent.** Amber appears on interactive elements only — primary buttons, focus rings,
   links, small indicators. Never as a large background fill.
3. **Whitespace over density.** Generous vertical padding between sections. Prefer breathing room to
   information density.
4. **Simple hierarchy.** Size and weight carry the hierarchy. Avoid decorative borders, gradients,
   or heavy shadows.
5. **Arrow CTAs.** Secondary actions use trailing `→` text links rather than outlined buttons where
   possible.

---

## Theming

Awano ships light and dark themes. Every colour is a semantic token defined once in `globals.css` as a
`light-dark()` custom property and exposed as a Tailwind utility through `@theme inline`, so components
use `bg-surface` / `text-fg-muted` / `border-border`, never a raw `zinc-*`. A theme swap is a variable
change, not a class rewrite.

The active theme is decided by CSS `color-scheme`: `:root` sets `light dark` so it follows the OS, and
`<html data-theme="…">` overrides it. The root layout reads a `theme` cookie server-side and stamps
that attribute, so the initial HTML already carries the right scheme — no flash. The header's
[`ThemeToggle`](../src/components/ThemeToggle.tsx) flips the attribute for instant feedback and writes
the cookie for the next render; it reads the effective theme with `useSyncExternalStore`, so an OS
theme change is reflected live.

## Colour tokens

Utility `X` below means `bg-X`, `text-X`, `border-X` as appropriate. Light values are the exact hexes
the app shipped with; dark is the counterpart.

| Token             | Role                                            | Light     | Dark                    |
| ----------------- | ----------------------------------------------- | --------- | ----------------------- |
| `surface`         | Page background, cards                           | `#ffffff` | `#18181b`               |
| `surface-muted`   | Section / nav backgrounds, login page            | `#fafafa` | `#1f1f23`               |
| `surface-subtle`  | Hover fills, chips, subtle panels                | `#f4f4f5` | `#27272a`               |
| `surface-inverse` | Inverted fills (selected pills)                  | `#18181b` | `#fafafa`               |
| `fg-strong`       | Headings, strong text                            | `#18181b` | `#fafafa`               |
| `fg`              | Form labels, default emphasis                    | `#3f3f46` | `#e4e4e7`               |
| `fg-secondary`    | Secondary emphasis, ghost text                   | `#52525b` | `#d4d4d8`               |
| `fg-muted`        | Body text                                        | `#71717a` | `#a1a1aa`               |
| `fg-subtle`       | Overline, footer, placeholder                    | `#a1a1aa` | `#71717a`               |
| `fg-on-inverse`   | Text on `surface-inverse`                        | `#ffffff` | `#18181b`               |
| `border`          | Input borders, card borders                      | `#e4e4e7` | `#3f3f46`               |
| `border-subtle`   | Dividers, subtle section borders                 | `#f4f4f5` | `#27272a`               |
| `primary`         | Buttons, focus rings, links (theme-agnostic)     | `#f59e0b` | `#f59e0b`               |
| `primary-hover`   | Hover state for primary                          | `#d97706` | `#d97706`               |
| `danger-surface` / `danger-text` / `danger-border` | Form errors     | `red-50/600/100` | translucent rose |
| `accent-amber-surface` / `accent-amber-text`       | Feature badges  | `amber-50/700`   | translucent amber |

`text-white` is kept (not tokenised) on amber `bg-primary` buttons, where white reads on both themes.

### Semantic status colours (ticket list & desk)

Exposed as `text-status-*` tokens (defined in `globals.css`), so each adapts to the theme.

| Status                 | Token             | Light basis     |
| ---------------------- | ----------------- | --------------- |
| `OPEN`                 | `status-open`     | zinc (fg-muted) |
| `IN_PROGRESS`          | `status-progress` | amber (primary) |
| `WAITING_ON_REQUESTER` | `status-waiting`  | amber-600       |
| `ESCALATED`            | `status-escalated`| rose-500        |
| `RESOLVED`             | `status-resolved` | emerald-600     |
| `CLOSED`               | `status-closed`   | zinc (fg-subtle)|

> Role and status **chips** (blue / violet / green tints on avatars and priority markers) are still raw
> Tailwind accents pending the `<StatusBadge>` unification (TODO §1); their text-on-chip contrast holds
> in dark, but the light tint backgrounds are not yet theme-aware.

---

## Typography

**Font family:** Geist Sans (`--font-sans`) for all UI text; Geist Mono (`--font-mono`) for feature
ordinals, ticket IDs, code snippets.

| Role             | Classes                                                       | Notes                        |
| ---------------- | ------------------------------------------------------------- | ---------------------------- |
| Display / hero   | `text-5xl sm:text-6xl font-semibold tracking-tight`           | Landing h1                   |
| Section heading  | `text-2xl font-semibold tracking-tight`                       | Desk / admin page titles     |
| Card title       | `text-base font-semibold text-fg-strong`                      |                              |
| Label / overline | `text-xs uppercase tracking-widest font-medium text-fg-subtle`| Section labels               |
| Body             | `text-sm leading-relaxed text-fg-muted`                       |                              |
| Form label       | `text-sm font-medium text-fg`                                 |                              |
| Ordinal badge    | `font-mono text-xs font-semibold text-primary`                | Feature markers (01, 02, 03) |

---

## Spacing & Layout

| Token          | Value               | Usage                            |
| -------------- | ------------------- | -------------------------------- |
| Page max-width | `max-w-5xl` (64rem) | Content container                |
| Page padding   | `px-8`              | Horizontal gutter                |
| Section gap    | `py-20`             | Features, stats sections         |
| Hero padding   | `py-28`             | Extra vertical room for the hero |
| Card padding   | `p-8`               | Login card, content cards        |
| Card gap       | `gap-12`            | Space between feature columns    |
| Form field gap | `gap-1.5`           | Label-to-input spacing           |
| Form group gap | `gap-4`             | Between form fields              |

---

## Components

### Button — primary

```tsx
<button className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
  Sign in
</button>
```

### Button — ghost / secondary

```tsx
<a className="inline-flex items-center justify-center h-11 px-6 rounded-md ring-ghost text-sm font-medium text-fg-secondary hover:text-fg-strong transition-colors">
  How it works →
</a>
```

### Arrow link (inline CTA)

```tsx
<Link className="text-sm font-medium text-primary hover:text-primary-hover transition-colors">
  Sign in →
</Link>
```

### Nav bar

```tsx
<nav className="flex items-center justify-between px-8 py-5 border-b border-border-subtle">
  <span className="text-base font-semibold tracking-tight">Awano</span>
  {/* right: amber arrow link */}
</nav>
```

### Feature ordinal badge

```tsx
<span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-accent-amber-surface text-primary text-xs font-semibold font-mono">
  01
</span>
```

### Section divider

```tsx
<section className="bg-surface-muted border-y border-border-subtle">
```

### Form input

```tsx
<input className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition" />
```

Focus state handled by `.ring-input:focus` in `globals.css` — primary color ring, no extra classes
needed.

### Login card

```tsx
<div className="rounded-xl border border-border bg-surface p-8 shadow-sm">
```

Centred on a `bg-surface-muted` full-height page. Themed via tokens — adapts to light and dark.

### Status badge (text-only, no background fill)

```tsx
<span className="text-xs font-medium uppercase tracking-wide text-primary">In progress</span>
```

Use semantic status colors from the Color table.

### Card (desk / ticket list item)

```tsx
<div className="rounded-xl bg-surface p-8 shadow-card">
  {/* shadow-card = subtle ring + soft lift, defined in globals.css */}
</div>
```

### Ghost button border

```tsx
<button className="... ring-ghost transition-colors">
```

### Login / modal panel

```tsx
<div className="rounded-2xl bg-surface p-10 shadow-panel">
  {/* shadow-panel = same ring + stronger drop shadow */}
</div>
```

All three border/shadow utilities are defined in `globals.css` and should be used instead of
arbitrary `ring-*` or `border-*` values.

---

## Icons

[Lucide React](https://lucide.dev/) at `size={16}` inline, `size={20}` standalone. Stroke width
`1.5`. No filled variants.

---

## Motion

`transition-colors` only on interactive elements. No translate, scale, or opacity animations on
functional UI. Reserve motion for skeleton loaders and optimistic status updates in the desk view.
