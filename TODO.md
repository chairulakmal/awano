# TODO

The build backlog for Awano's next iteration. The single focus is a user-facing UI/UX revamp: turning a correct support desk into one that feels like a frontier Next.js 16 app to use, not just to read the source of. Below: where the plan stands and how to read it, then the revamp grouped from foundation upward (design system, app shell, desk and ticket experience, feedback and states, accessibility, internationalization, performance and Next 16 features, marketing surface), and finally a short non-UX backlog.

Rules of the doc: `docs/DESIGN.md` owns the visual language and every token or component this list touches; `docs/SPEC.md` owns behaviour and permissions; `docs/i18n.md` owns the i18n and mobile implementation detail. This file only tracks *what to build and in what order*. When an item lands, its rule moves into the doc that owns it, the checkbox is ticked here, and the shipped entry moves to [CHANGELOG.md](CHANGELOG.md), so no fact lives in two places.

## Contents

- [Status and critical path](#status-and-critical-path)
- [How to read this](#how-to-read-this)
- [1. Design system foundation](#1-design-system-foundation)
- [2. App shell and navigation](#2-app-shell-and-navigation)
- [3. Desk and ticket experience](#3-desk-and-ticket-experience)
- [4. Feedback and states](#4-feedback-and-states)
- [5. Accessibility](#5-accessibility)
- [6. Internationalization](#6-internationalization)
- [7. Performance and Next 16 features](#7-performance-and-next-16-features)
- [8. Marketing surface](#8-marketing-surface)
- [Beyond UX (backlog)](#beyond-ux-backlog)

## Status and critical path

v1.0.0 shipped (2026-05-21, see [CHANGELOG.md](CHANGELOG.md)); the revamp below is the active iteration and none of it has started yet. Four **P0** items are the critical path, because everything in sections 3-8 assumes them:

1. **Design tokens under `@theme`** (§1) — today `globals.css` hardcodes light-only `rgba(…)` in the ring and shadow utilities, so no other surface can be themed until the scales become variables.
2. **Dark mode** (§1) — every surface below must ship both themes, so this has to land early or become a retrofit.
3. **Responsive navigation** (§2) — the mobile shell behaviour that later desk and ticket work builds on.
4. **Toast system** (§4) — the feedback primitive the optimistic actions in §3 surface their results through.

Do these first, roughly in this order. The rest of the sections then proceed foundation-upward.

## How to read this

- `[ ]` not started, `[~]` in progress, `[x]` done. Priority tiers: **P0** unblocks other work, **P1** ship-in-this-iteration, **P2** nice-to-have.
- Each item names the surface it changes so the diff is predictable. A revamp item is done only when it works at every breakpoint and passes the accessibility bar in section 5.
- Order roughly follows the sections: the design system (1) and shell (2) are foundations that later sections build on.

## 1. Design system foundation

The current language is light-only amber with text-only status colours (`docs/DESIGN.md`). The revamp keeps that identity and makes it systematic and theme-aware.

- [ ] **P0** Promote colour, spacing, and typography scales to CSS custom properties in `globals.css` under `@theme`, so a theme swap is a variable change, not a class rewrite.
- [ ] **P0** Dark mode. DESIGN.md currently defers it; this iteration lands it. Define dark tokens, wire a `prefers-color-scheme` default with a manual toggle, and persist the choice. Every surface below must ship both themes.
- [ ] **P1** Status system: promote the six ticket statuses to filled badges with an icon, keeping the semantic colours already in DESIGN.md, and reuse one `<StatusBadge>` everywhere instead of ad-hoc spans.
- [ ] **P1** A motion vocabulary: standard durations and easings as tokens. DESIGN.md today allows `transition-colors` only; extend it deliberately (enter/exit, list reorder) without decorative animation.
- [ ] **P2** A minimal component inventory page at `/style` (dev-only) rendering every primitive in both themes, as a living reference and visual-regression target.

## 2. App shell and navigation

- [ ] **P0** Responsive navigation: inline links on `sm+`, a hamburger dropdown on mobile that matches the existing `UserMenu` interaction, across `Header`, `NavMenu`, and `DeskSidebar`. Mobile card and drawer layouts are specced in [docs/i18n.md](docs/i18n.md#mobile-layouts).
- [ ] **P1** Command palette (`Cmd/Ctrl-K`): jump to a ticket by id or title, switch views, trigger status changes the current role is allowed to make. Actions are role-gated by reusing the FSM and assertions, never a client-side allowlist.
- [ ] **P1** Global keyboard shortcuts for the desk (next/prev ticket, assign to me, change status) with a discoverable `?` cheat-sheet overlay.
- [ ] **P2** Breadcrumbs and a persistent context bar so an agent always knows which team, queue, and ticket they are in.

## 3. Desk and ticket experience

The desk already uses cursor pagination and optimistic status buttons. This section widens optimism and live feel to the whole surface.

- [ ] **P1** Stream the desk with Suspense boundaries so the shell and filters paint before the ticket list resolves, with skeletons standing in (section 4).
- [ ] **P1** Optimistic everywhere: comment posting, assignment, and category edits apply instantly and revert on server rejection, matching the existing `StatusForm` pattern.
- [ ] **P1** Filter and sort bar on the ticket list (status, assignee, category, updated-at) with state in the URL so a filtered queue is shareable and back-button safe.
- [ ] **P2** Live updates: reflect another agent's status change or new comment without a manual refresh. Decide the transport (poll first, then evaluate streaming) as its own spike below.
- [ ] **P2** Ticket detail redesign: a two-column layout with the conversation as the spine and metadata/actions in a sticky rail, collapsing to one column on mobile.
- [ ] **P2** Attachment previews inline (image thumbnails, PDF first-page) instead of a bare download link.

## 4. Feedback and states

- [ ] **P0** A toast system for server-action results (success, error, permission denied) that reads the same message the server returned, so feedback never contradicts the outcome.
- [ ] **P1** Skeleton loaders for the desk list, ticket detail, and admin metrics, sized to the real content to avoid layout shift.
- [ ] **P1** First-class empty states (no tickets, no results after filtering, new team) with a clear next action rather than a blank panel.
- [ ] **P1** Error boundaries per route segment with a retry affordance, so one failed fetch does not blank the whole shell.
- [ ] **P2** Inline form validation surfaced from the existing Zod schemas, shown per-field before submit where the schema allows.

## 5. Accessibility

The bar every revamp item is measured against, not a separate phase.

- [ ] **P0** Keyboard-operable everything: focus-visible rings (already tokenised via `.ring-input`), logical tab order, no keyboard traps in the palette or dropdowns.
- [ ] **P1** Semantic landmarks and ARIA on nav, dialogs, toasts (`aria-live`), and status badges so a screen reader announces state changes.
- [ ] **P1** Colour-contrast audit of both themes against WCAG AA, especially the amber-on-white interactive states and the status colours.
- [ ] **P2** Respect `prefers-reduced-motion` by disabling the section 1 motion vocabulary.

## 6. Internationalization

Planned direction: EN/JA via `next-intl`, since most recruiters viewing the demo read Japanese. UI copy must be locale-ready before this lands. Full implementation detail (routing, message catalogs, Noto Sans JP loading, IME-aware inputs, the switcher, and the mobile card/drawer layouts) is in [docs/i18n.md](docs/i18n.md).

- [ ] **P1** Extract all user-facing strings to message catalogs; no literals in components.
- [ ] **P1** Locale routing and a language switcher in the shell, defaulting from the `Accept-Language` header.
- [ ] **P2** Localize dates, relative times, and number formats via `Intl`, not hand-rolled formatting.
- [ ] **P2** A JA translation pass and a right-length review (Japanese strings change layout).

## 7. Performance and Next 16 features

Frontier feel comes from the platform, used where it genuinely helps, not everywhere.

- [ ] **P1** View Transitions between the ticket list and detail so navigation feels continuous rather than a full repaint.
- [ ] **P1** Audit Server vs Client component boundaries: keep interactivity in leaves, push data fetching up, shrink the client bundle.
- [ ] **P2** Prefetch ticket detail on list-row hover/focus so opening a ticket is instant.
- [ ] **P2** Spike Partial Prerendering for the desk shell. Note: it needs `cacheComponents: true`, which the project does not set today (`CLAUDE.md` invariant); this is an evaluation, not a commitment.
- [ ] **P2** Core Web Vitals budget in CI (LCP, INP, CLS) so a regression fails the build, not review.

## 8. Marketing surface

- [ ] **P2** Landing-page refresh consistent with the new design system and dark mode: tighten the hero, make the feature list demonstrate the engineering hooks visually.
- [ ] **P2** A short in-app product tour or annotated demo state that points a first-time recruiter at the interesting behaviour (FSM, tenant isolation, optimistic UI).

## Beyond UX (backlog)

Not this iteration's focus, kept here so it is not lost.

- [ ] **Typed FSM library extraction.** Parked for later, a possible npm extract after Awano ships. Awano's ticket workflow (`OPEN` → `IN_PROGRESS` → …) is a good dogfood case. Improvements worth exploring versus `typescript-fsm`:
  - Typed event payloads (`dispatch(event, payload)`).
  - Separate guards from side effects (auth and role checks before a transition).
  - A context object (actor, entity id) threaded through transitions.
  - Concurrency: single-flight or a queue on async `dispatch`.
  - Explicit terminal states, plus serialization for persistence.
  - Stronger types: valid events narrowed by the current state.
- [ ] Dependabot dependency check, run once rather than on a recurring schedule: a single audit/update pass, not a standing `dependabot.yml` that opens PRs on an interval.
- [ ] Notification model (email or in-app) for assignment and status changes.
- [ ] Saved views / queues per agent.
- [ ] Bulk ticket actions from the list.
