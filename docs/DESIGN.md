# Awano: Design Guide

This is the brand and UI system for Awano, a multi-tenant support desk. The one rule everything else serves: **Awano should feel calm and deliberate, the temperament you want from the desk handling your request.** That single idea sets the palette (paper and ink, one quiet accent), the type, the copy, and the seal. Below: the brand thesis, the theming mechanism, the colour and type tokens, the writing voice, and the component recipes that build on them.

|                  |                                                        |
| ---------------- | ------------------------------------------------------ |
| **Version**      | 1.0                                                    |
| **Last updated** | 2026-07-23                                             |
| **Brand**        | 淡 Awa: pale, unhurried, kept like fine stationery    |
| **Accent**       | Indigo `#3A4A7A` (藍, ai) · Seal `#C4361F` (朱, shu)   |

## Contents

- [Brand](#brand): the thesis, the three colours, the seal
- [Principles](#principles)
- [Theming](#theming): how a token resolves per theme
- [Colour tokens](#colour-tokens)
- [Semantic status colours](#semantic-status-colours-ticket-list--desk)
- [Typography](#typography)
- [Voice & tone](#voice--tone)
- [Spacing & layout](#spacing--layout)
- [Components](#components)
- [The seal](#the-seal)
- [Icons](#icons)
- [Motion](#motion)

---

## Brand

**The name is the brief.** *Awa* (淡) means pale, light, faint, delicate: the quality of ink diluted to a wash, of understatement. A support desk lives in the opposite feeling, the pressure of a queue that never empties. Awano's job is to make that pressure feel handled. So the brand is 淡: it stays quiet on purpose, and spends its one loud gesture on the moment a request is finished.

**Three colours, three jobs.** The palette is disciplined to exactly three roles so nothing competes.

1. **Paper & ink** carry everything. Warm washi off-white and sumi-ink greys (light), sumi paper and pale ink (dark). This is 95% of every screen.
2. **Indigo** (藍, `#3A4A7A`) is the single action colour: buttons, links, focus rings, the in-progress state. It never fills a large area; it marks what you can act on.
3. **Vermilion** (朱, `#C4361F`) is the **seal**, and nothing else. It appears only as the hanko mark, so it always reads as one thing: Awano's stamp.

**The signature is the seal.** In Japan a red hanko means *done, official, on the record*. That is exactly what a resolved ticket is here: settled, and preserved in an audit trail that cannot be edited. So the seal is the brand mark (淡 in the wordmark) and the emotional payoff (済, *settled*, stamped across the hero). One bold mark, everything else kept calm around it. See [The seal](#the-seal).

---

## Principles

1. **Themed, not hard-coded.** Every colour is a semantic token (`surface`, `fg`, `border`, …) that resolves per theme. A surface must never reach for a raw `zinc-*` / `white` class. Light stays the default and the design's reference point.
2. **Quiet by default, bold once.** Paper and ink carry the page. Indigo marks action; vermilion is only ever the seal. If a screen has more than one loud element, one of them is wrong.
3. **Whitespace over density.** Generous vertical padding between sections. Prefer breathing room to information density.
4. **Structure that means something.** Numbering, eyebrows, and dividers encode real order, not decoration. The workflow steps (Submit → Triage → Resolve) are numbered because sequence matters; the capability cards are not, because they are parallel.
5. **Simple hierarchy.** Size, weight, and the display face carry the hierarchy. Avoid decorative borders, gradients, or heavy shadows.
6. **Arrow CTAs.** Secondary actions use trailing `→` text links rather than outlined buttons where possible.

---

## Theming

Awano ships light and dark themes. Every colour is a semantic token defined once in `globals.css` as a `light-dark()` custom property and exposed as a Tailwind utility through `@theme inline`, so components use `bg-surface` / `text-fg-muted` / `border-border`, never a raw hex. A theme swap is a variable change, not a class rewrite.

The active theme is decided by CSS `color-scheme`: `:root` sets `light dark` so it follows the OS, and `<html data-theme="…">` overrides it. The root layout reads a `theme` cookie server-side and stamps that attribute, so the initial HTML already carries the right scheme, with no flash. The header's [`ThemeToggle`](../src/components/ThemeToggle.tsx) flips the attribute for instant feedback and writes the cookie for the next render; it reads the effective theme with `useSyncExternalStore`, so an OS theme change is reflected live.

## Colour tokens

Utility `X` below means `bg-X`, `text-X`, `border-X` as appropriate. Light is washi paper and sumi ink; dark is the sumi-paper counterpart.

| Token             | Role                                            | Light     | Dark      |
| ----------------- | ----------------------------------------------- | --------- | --------- |
| `surface`         | Page background, raised cards                    | `#fbfaf6` | `#1c1b19` |
| `surface-muted`   | Sections, hero, nav, login page                  | `#f1f0eb` | `#211f1c` |
| `surface-subtle`  | Hover fills, chips, sunk panels                  | `#e9e7df` | `#2a2825` |
| `surface-inverse` | Inverted fills (selected pills)                  | `#1c1b19` | `#f1f0eb` |
| `fg-strong`       | Headings, strong text                            | `#1c1b19` | `#f4f2ec` |
| `fg`              | Form labels, default emphasis                    | `#33302a` | `#e2dfd6` |
| `fg-secondary`    | Marketing body, secondary emphasis               | `#4b473f` | `#c9c5bb` |
| `fg-muted`        | Body text, muted labels                          | `#6b665b` | `#a29c90` |
| `fg-subtle`       | Overline, footer, placeholder                    | `#9a9585` | `#726d62` |
| `fg-on-inverse`   | Text on `surface-inverse`                        | `#fbfaf6` | `#1c1b19` |
| `border`          | Input borders, card borders                      | `#dedbd0` | `#38352f` |
| `border-subtle`   | Dividers, subtle section borders                 | `#eceae2` | `#2a2825` |
| `primary`         | Buttons, links, focus rings, in-progress (indigo)| `#3a4a7a` | `#9aa7da` |
| `primary-hover`   | Hover state for primary                          | `#2e3a61` | `#b4c0e6` |
| `primary-fg`      | Text/icon on a solid `bg-primary` fill           | `#ffffff` | `#191a1e` |
| `seal`            | Hanko mark only (vermilion, 朱)                   | `#c4361f` | `#e3654e` |
| `seal-tint`       | Seal fill wash                                   | shu @ 7%  | shu @ 15% |
| `danger-surface` / `danger-text` / `danger-border` | Form errors    | `red-50/600/100` | translucent rose |
| `accent-amber-surface` / `accent-amber-text`       | Waiting / admin chips (secondary warm) | `amber-50/700` | translucent amber |

`primary` is theme-aware: dark indigo on paper, pale indigo on sumi, so links stay legible on both. A solid indigo fill therefore can't assume white text, so buttons use `text-primary-fg` (white in light, sumi in dark), never a raw `text-white`.

Amber is no longer the brand colour; it is demoted to a secondary warm for waiting/admin chips (`accent-amber-*`) and the amber status below. Indigo owns action; vermilion owns the seal.

### Semantic status colours (ticket list & desk)

Exposed as `text-status-*` tokens (defined in `globals.css`), so each adapts to the theme. These follow convention (green = resolved, so success toasts read green); the vermilion seal is a brand mark, not a status colour.

| Status                 | Token             | Basis               |
| ---------------------- | ----------------- | ------------------- |
| `OPEN`                 | `status-open`     | zinc (fg-muted)     |
| `IN_PROGRESS`          | `status-progress` | indigo (primary)    |
| `WAITING_ON_REQUESTER` | `status-waiting`  | amber-600           |
| `ESCALATED`            | `status-escalated`| rose-500            |
| `RESOLVED`             | `status-resolved` | emerald-600         |
| `CLOSED`               | `status-closed`   | zinc (fg-subtle)    |

> Role and status **chips** (blue / violet / amber tints on avatars and priority markers) are still raw Tailwind accents pending the `<StatusBadge>` unification (TODO §1); their text-on-chip contrast holds in dark, but the light tint backgrounds are not yet theme-aware.

---

## Typography

Three faces, three jobs. The display face gives headings a voice distinct from the reading text.

**Display:** Hanken Grotesk (`--font-display`), a warm low-contrast grotesque, for the wordmark, the hero, and every page heading (`<h1>`) across the desk, admin, and marketing surfaces.
**Body / UI:** Geist Sans (`--font-sans`) for all reading and interface text.
**Mono:** Geist Mono (`--font-mono`) for ticket IDs, ordinals in a true sequence, and code.

| Role             | Classes                                                        | Notes                          |
| ---------------- | ------------------------------------------------------------- | ------------------------------ |
| Display / hero   | `font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight` | Landing h1     |
| Marketing h2     | `font-display text-3xl sm:text-4xl font-semibold tracking-tight` | Landing CTA heading         |
| Section heading  | `font-display text-xl sm:text-2xl font-semibold tracking-tight` | Desk / admin page titles     |
| Card title       | `text-base font-semibold text-fg-strong`                      |                                |
| Label / overline | `text-xs uppercase tracking-widest font-medium text-fg-subtle`| Section labels                 |
| Body             | `text-sm leading-relaxed text-fg-muted`                       |                                |
| Form label       | `text-sm font-medium text-fg`                                 |                                |
| Sequence ordinal | `font-mono text-xs font-semibold text-primary tracking-widest`| Workflow steps (01, 02, 03) only |

---

## Voice & tone

Copy is design material. It should sound like Awano: plain, specific, unhurried. The rules, with examples from the product:

- **Speak from the user's side of the screen.** Name things by what a person does, not how the system is built. "My Tickets", "Queue", "Try the demo →".
- **Active voice, and an action keeps its name through the flow.** The button that says "Save changes" produces a toast that says "Saved", never "Submit" then "Success".
- **Sentence case, no filler.** "Enter your team workspace credentials." Not "Please enter your credentials below to continue."
- **Errors are specific and never apologise.** Say what happened and how to fix it, in the interface's voice: "That team workspace wasn't found", not "Oops, something went wrong".
- **Empty states invite the next action** rather than describing emptiness.
- All user-facing strings live in a `COPY` object per screen, ready for `t()` calls when next-intl lands (see `docs/i18n.md`).

---

## Spacing & layout

| Token          | Value               | Usage                            |
| -------------- | ------------------- | -------------------------------- |
| Page max-width | `max-w-5xl` (64rem) | Content container                |
| Page padding   | `px-6 sm:px-8`      | Horizontal gutter                |
| Section gap    | `py-14 sm:py-20`    | Features, workflow, stats        |
| Hero padding   | `py-14 sm:py-24`    | Extra vertical room for the hero |
| Card padding   | `p-8`               | Login card, content cards        |
| Card gap       | `gap-6`             | Space between feature cards      |
| Form field gap | `gap-1.5`           | Label-to-input spacing           |
| Form group gap | `gap-4`             | Between form fields              |

---

## Components

### Button: primary

```tsx
<button className="inline-flex items-center justify-center h-11 px-6 rounded-md bg-primary text-primary-fg text-sm font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
  Sign in
</button>
```

Use `text-primary-fg`, never `text-white`: a solid indigo fill carries white in light and sumi in dark.

### Button: ghost / secondary

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

### Wordmark

The brand lockup: the 淡 seal glyph beside "Awano" in the display face. The seal rights itself from a slight tilt on hover.

```tsx
<Link href="/" className="group inline-flex items-center gap-2 text-fg-strong" aria-label="Awano: home">
  <span className="seal grid place-items-center w-6 h-6 text-[13px] font-medium -rotate-6 group-hover:rotate-0 transition-transform" aria-hidden="true">淡</span>
  <span className="font-display text-base font-semibold tracking-tight group-hover:text-primary transition-colors">Awano</span>
</Link>
```

### Feature card (parallel capability)

```tsx
<div className="bg-surface rounded-xl p-8 flex flex-col gap-4 shadow-card">
  {/* An indigo keyline, not a number: capabilities are parallel, not sequential. */}
  <span className="w-7 h-0.5 rounded-full bg-primary" aria-hidden="true" />
  <h3 className="text-base font-semibold text-fg-strong leading-snug">{title}</h3>
  <p className="text-sm text-fg-secondary leading-relaxed">{body}</p>
</div>
```

### Section divider

```tsx
<section className="bg-surface-muted border-y border-border-subtle">
```

### Form input

```tsx
<input className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition" />
```

Focus state is handled by `.ring-input:focus` in `globals.css`: an indigo `primary` ring, no extra classes needed.

### Card (desk / ticket list item)

```tsx
<div className="rounded-xl bg-surface p-8 shadow-card">
  {/* shadow-card = subtle ring + soft lift, defined in globals.css */}
</div>
```

### Login / modal panel

```tsx
<div className="rounded-2xl bg-surface p-10 shadow-panel">
  {/* shadow-panel = same ring + stronger drop shadow */}
</div>
```

`ring-ghost`, `ring-input`, `ring-subtle`, `shadow-card`, and `shadow-panel` are all defined in `globals.css`; use them instead of arbitrary `ring-*` / `border-*` / `shadow-*` values.

---

## The seal

The seal is Awano's signature. It is the one place the design is allowed to be loud, so it is used sparingly and always in vermilion (`--seal`), never as a status colour.

**Two kanji, two meanings:**

- **淡** (*awa*, the name) is the **brand mark**: the wordmark glyph, the login mark, the footer. Rendered with `.seal`.
- **済** (*settled*) is the **product's payoff**: stamped across the hero, it is what a resolved, audit-logged ticket becomes. Rendered with `.seal-lg`.

**Utilities** (`globals.css`):

- `.seal`: a single vermilion ring around a centred kanji over a faint `seal-tint` wash. For small marks (wordmark, footer, login).
- `.seal-lg`: the hero stamp: a hand-inked double ring for the large 済 signature.

**Rules:**

- Always tilt it a few degrees (`-rotate-6`) so it reads as stamped by hand, not printed.
- Decorative marks are `aria-hidden`; the accessible name lives on the parent (e.g. the wordmark link).
- Never recolour the seal, and never use vermilion anywhere else.

---

## Icons

[Lucide React](https://lucide.dev/) at `size={16}` inline, `size={20}` standalone. Stroke width `1.5`. No filled variants.

---

## Motion

`transition-colors` on interactive elements; `transition-transform` only on the seal (the wordmark rights itself on hover). No translate, scale, or opacity animations on functional UI. Reserve motion for skeleton loaders and optimistic status updates in the desk view.
