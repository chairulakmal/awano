# Awano — Design Guide

|                  |                                                |
| ---------------- | ---------------------------------------------- |
| **Version**      | 0.2                                            |
| **Last updated** | 2026-05-19                                     |
| **Aesthetic ref**| tokuty.jp — clean, light, generous whitespace  |
| **Primary**      | Amber `#F59E0B` (Tailwind amber-500)           |

---

## Principles

1. **Light-first.** All surfaces default to white/zinc-50. Dark mode is not a current priority.
2. **Sparse accent.** Amber appears on interactive elements only — primary buttons, focus rings, links, small indicators. Never as a large background fill.
3. **Whitespace over density.** Generous vertical padding between sections. Prefer breathing room to information density.
4. **Simple hierarchy.** Size and weight carry the hierarchy. Avoid decorative borders, gradients, or heavy shadows.
5. **Arrow CTAs.** Secondary actions use trailing `→` text links rather than outlined buttons where possible.

---

## Color

| Token                   | Value       | Use                                                        |
| ----------------------- | ----------- | ---------------------------------------------------------- |
| `--color-primary`       | `#f59e0b`   | Primary buttons, focus rings, links, active indicators     |
| `--color-primary-hover` | `#d97706`   | Hover state for all primary elements                       |
| `white`                 | `#ffffff`   | Page background, cards                                     |
| `zinc-50`               | `#fafafa`   | Section backgrounds (alternating), login page bg           |
| `zinc-100`              | `#f4f4f5`   | Dividers, subtle section borders                           |
| `zinc-200`              | `#e4e4e7`   | Input borders, card borders, stat dividers                 |
| `zinc-400`              | `#a1a1aa`   | Overline text, footer text, placeholder                    |
| `zinc-500`              | `#71717a`   | Body text, form labels (secondary)                         |
| `zinc-700`              | `#3f3f46`   | Form labels (primary)                                      |
| `zinc-900`              | `#18181b`   | Headings, strong text                                      |
| `amber-50`              | `#fffbeb`   | Feature number badge background                            |
| `red-50 / red-600`      | —           | Error messages in forms                                    |

### Semantic status colors (ticket list & desk)

| Status                 | Text color      | Tailwind class         |
| ---------------------- | --------------- | ---------------------- |
| `OPEN`                 | Zinc            | `text-zinc-500`        |
| `IN_PROGRESS`          | Amber (primary) | `text-primary`         |
| `WAITING_ON_REQUESTER` | Amber dark      | `text-amber-600`       |
| `ESCALATED`            | Rose            | `text-rose-500`        |
| `RESOLVED`             | Emerald         | `text-emerald-600`     |
| `CLOSED`               | Zinc muted      | `text-zinc-400`        |

---

## Typography

**Font family:** Geist Sans (`--font-sans`) for all UI text; Geist Mono (`--font-mono`) for feature ordinals, ticket IDs, code snippets.

| Role              | Classes                                            | Notes                            |
| ----------------- | -------------------------------------------------- | -------------------------------- |
| Display / hero    | `text-5xl sm:text-6xl font-semibold tracking-tight` | Landing h1                      |
| Section heading   | `text-2xl font-semibold tracking-tight`            | Desk / admin page titles         |
| Card title        | `text-base font-semibold text-zinc-900`            |                                  |
| Label / overline  | `text-xs uppercase tracking-widest font-medium text-zinc-400` | Section labels        |
| Body              | `text-sm leading-relaxed text-zinc-500`            |                                  |
| Form label        | `text-sm font-medium text-zinc-700`                |                                  |
| Ordinal badge     | `font-mono text-xs font-semibold text-primary`     | Feature markers (01, 02, 03)     |

---

## Spacing & Layout

| Token           | Value           | Usage                                            |
| --------------- | --------------- | ------------------------------------------------ |
| Page max-width  | `max-w-5xl` (64rem) | Content container                            |
| Page padding    | `px-8`          | Horizontal gutter                                |
| Section gap     | `py-20`         | Features, stats sections                         |
| Hero padding    | `py-28`         | Extra vertical room for the hero                 |
| Card padding    | `p-8`           | Login card, content cards                        |
| Card gap        | `gap-12`        | Space between feature columns                    |
| Form field gap  | `gap-1.5`       | Label-to-input spacing                           |
| Form group gap  | `gap-4`         | Between form fields                              |

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
<a className="inline-flex items-center justify-center h-11 px-6 rounded-md border border-zinc-200 text-sm font-medium text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 transition-colors">
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
<nav className="flex items-center justify-between px-8 py-5 border-b border-zinc-100">
  <span className="text-base font-semibold tracking-tight">Awano</span>
  {/* right: amber arrow link */}
</nav>
```

### Feature ordinal badge

```tsx
<span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-primary text-xs font-semibold font-mono">
  01
</span>
```

### Section divider

```tsx
<section className="bg-zinc-50 border-y border-zinc-100">
```

### Form input

```tsx
<input className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-primary focus:ring-2 focus:ring-amber-100 transition" />
```

Focus ring: `focus:ring-amber-100` (very light amber glow, not harsh).

### Login card

```tsx
<div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
```

Centred on a `bg-zinc-50` full-height page. No dark-mode variants — light only.

### Status badge (text-only, no background fill)

```tsx
<span className="text-xs font-medium uppercase tracking-wide text-primary">
  In progress
</span>
```

Use semantic status colors from the Color table.

### Card (desk / ticket list item)

```tsx
<div className="rounded-lg border border-zinc-200 bg-white p-5 hover:border-zinc-300 transition-colors">
```

---

## Icons

[Lucide React](https://lucide.dev/) at `size={16}` inline, `size={20}` standalone. Stroke width `1.5`. No filled variants.

---

## Motion

`transition-colors` only on interactive elements. No translate, scale, or opacity animations on functional UI. Reserve motion for skeleton loaders and optimistic status updates in the desk view.
