# Awano — Build Plan

**Last updated: 2026-05-22 — post-v1 improvements.**

| Area | Status |
|---|---|
| All application routes | ✓ shipped |
| Auth, session, route guards | ✓ bcrypt 12, stateless JWT, proxy.ts |
| Password change + security hardening | ✓ rate limiting, HSTS, session eviction |
| Login rate limiting | ✓ 5 attempts / 15 min per email |
| File attachments | ✓ bytea, 1 MB limit, MIME allowlist, thumbnails |
| Cursor-based pagination | ✓ desk + requester lists + all-tickets, "Load more" |
| Ticket search | ✓ ILIKE on subject/body, debounced sidebar input |
| Role-aware navigation | ✓ per-role header links, responsive hamburger on mobile |
| Manager all-tickets view | ✓ `/admin/tickets` — all statuses, status filter, cursor pagination |
| Assign self-only for Support | ✓ SPEC-compliant; regression caught by unit tests |
| CI + branch protection | ✓ GitHub Actions, main branch ruleset |
| Deployment | ✓ Railway, `awano.chairulakmal.com` |
| Unit tests | ✓ 230 passing (8 files) |
| E2E tests | ✓ 7 Playwright specs |

---

## Completed

### Auth foundation — 2026-05-14

_Credentials provider, bcrypt, stateless JWT, role-gated proxy, login page, Prisma singleton, seed data._

- [x] Packages: `next-auth@beta`, `bcryptjs`, `zod`
- [x] `src/auth.ts` — Credentials provider; team slug → teamId; SUPER path; bcrypt verify; JWT
      payload; `z.preprocess` guard for Auth.js URLSearchParams `undefined`→`"undefined"` quirk
- [x] `src/proxy.ts` — Role-gated route guards (Next.js 16 proxy convention); `roleHome` post-login
      redirect; replaced deprecated `middleware.ts`
- [x] `src/lib/auth/assertions.ts` — `assertAuthenticated`, `assertRole`, `assertSameTeam`,
      `assertCanViewTicket`, `assertCanUpdateTicket`
- [x] `src/app/login/page.tsx` — Server component + `LoginForm` client form + server action
- [x] `src/lib/db.ts` — Prisma singleton
- [x] `prisma/seed.ts` + `prisma/tickets.ts` — 1 super, 2 teams, 14 users, 18 tokutei ginou scenario
      tickets across all statuses/priorities, status events, comments

### Service foundation — 2026-05-20

_Ticket FSM (`assertTransition`), full ticket service layer (create, list, assign, transition, comment), Zod validation on every boundary._

- [x] `src/lib/tickets/fsm.ts` — `assertTransition` + `getAllowedTransitions`; pure, no Prisma; role
      rank table drives both functions
- [x] `src/lib/tickets/service.ts` — `createTicket`, `listMyTickets`, `listDeskTickets`,
      `getTicket`, `assignTicket`, `transitionStatus`, `setPriority`, `postComment`; each follows
      Zod → assert auth → Prisma; `transitionStatus` wraps ticket update + `StatusEvent` in a single
      transaction

### Requester routes — 2026-05-20

_My tickets list, create-ticket form, thread view with public comment reply._

- [x] `src/app/tickets/layout.tsx` — shared layout with Header
- [x] `src/app/tickets/page.tsx` — My tickets list with status badges
- [x] `src/app/tickets/new/page.tsx` + `NewTicketForm.tsx` + `actions.ts` — create ticket flow
- [x] `src/app/tickets/[id]/page.tsx` + `CommentForm.tsx` + `actions.ts` — thread view + reply form

### Desk routes — 2026-05-20

_Support inbox (unassigned · mine · open · escalated), ticket detail with assign/status/priority/internal-note controls, optimistic status transitions._

- [x] `src/lib/users/service.ts` — `listTeamMembers` for assignee dropdown
- [x] `src/app/desk/layout.tsx` — sidebar layout with `DeskSidebar` (My queue / Team queue sections)
- [x] `src/app/desk/page.tsx` — ticket list filtered by `?view=` param (unassigned · mine · open ·
      escalated)
- [x] `src/app/desk/[id]/page.tsx` — 2-column detail: body + thread + reply form / status +
      assignee + priority + timeline
- [x] `src/app/desk/[id]/StatusForm.tsx` — status transitions with `useOptimistic` + `useTransition`
- [x] `src/app/desk/[id]/AssignForm.tsx` + `PriorityForm.tsx` + `DeskCommentForm.tsx` — sidebar
      controls; internal note toggle
- [x] `src/components/DeskSidebar.tsx` — client sidebar with active-link state; "Mine" separated
      from team queue views

### Admin routes — 2026-05-20

_User management (role changes), category CRUD, dashboard metrics (status breakdown, avg response time, top assignees)._

- [x] `src/lib/users/service.ts` — added `listTeamUsers`, `changeUserRole`
- [x] `src/lib/categories/service.ts` — `listCategories`, `createCategory` (auto-slug),
      `deleteCategory` (guards against ticket references)
- [x] `src/lib/admin/service.ts` — `getDashboardMetrics` (status counts, unassigned, avg first
      response, opened/closed 30d, top assignees); explicit `teamId` filter on all sub-queries
- [x] `src/app/admin/layout.tsx` + `AdminNav.tsx` — shared layout with active-link nav
- [x] `src/app/admin/users/` — users table with per-row role change (`ChangeRoleForm`); self-edit
      disabled
- [x] `src/app/admin/categories/` — categories table + `NewCategoryForm`; delete only when ticket
      count = 0
- [x] `src/app/admin/dashboard/` — 4 stat cards + status breakdown table + top assignees list

### Super routes — 2026-05-20

_Team provisioning, per-team user creation, demo seed button, team detail view._

- [x] `src/lib/teams/service.ts` — `listTeams`, `createTeam`, `getTeamDetail`, `createUserInTeam`,
      `seedDemoUsers`
- [x] `src/app/super/layout.tsx` + `SuperNav.tsx` — shared layout with active-link nav
- [x] `src/app/super/teams/` — teams table + `NewTeamForm` (name + slug + notes); redirects to
      detail on create
- [x] `src/app/super/teams/[id]/` — team detail: users table with role badges + breadcrumb;
      `SeedDemoButton`; `+ Add user` link
- [x] `src/app/super/teams/[id]/users/new/` — create user form: name, email, password, role
      dropdown, conditional requester type; redirects back to team on success

### CI + branch protection — 2026-05-21

_GitHub Actions (lint → tsc → vitest → build), PR template, main branch ruleset blocking direct pushes._

- [x] `.github/workflows/ci.yml` — runs lint → tsc → vitest → next build on every push and PR to
      `main`; no Postgres needed (service tests mock Prisma)
- [x] `.github/pull_request_template.md` — What / Why / Test plan checklist on every PR
- [x] GitHub branch protection on `main` — requires PR, requires `ci` job to pass, no direct push,
      no force push (configured in GitHub Settings → Branches after first CI merge)

### Deployment — 2026-05-21

_Standalone Next.js container on Railway, managed Postgres, pre-deploy migrations, `trustHost` fix for TLS proxy._

- [x] `next.config` — `output: "standalone"` for minimal production image
- [x] `railway.json` — Railpack builder; `preDeployCommand: ["npx prisma migrate deploy"]` runs
      migrations before new container goes live; `HOSTNAME=0.0.0.0` binds to all interfaces; static
      asset copy in `buildCommand`; restart policy and `asia-southeast1` region pinned
- [x] Railway managed PostgreSQL — `DATABASE_URL` injected via service reference variable;
      `AUTH_SECRET` set in Railway dashboard; `AUTH_URL` intentionally unset (see below)
- [x] `trustHost: true` in `auth.config.ts` — Railway terminates TLS at its load balancer; without
      this flag Auth.js cannot resolve the public origin from forwarded headers and falls back to
      `pages.signIn` after every login. `AUTH_URL` must also be unset in Railway: even setting it to
      the correct production URL causes it to override the forwarded-header detection, reproducing
      the same redirect failure
- [x] Live at `awano.chairulakmal.com`

### Profile / settings page — 2026-05-21

_Password change modal at `/profile`, `UserMenu` dropdown in header, bcrypt verify before save._

- [x] `src/lib/users/service.ts` — added `changeMyPassword`; verifies current password with bcrypt
      before hashing and saving the new one; uses `session.userId` as the identity anchor
- [x] `src/app/profile/actions.ts` — `changePasswordAction`; Zod schema: `min(15)` on new password,
      `refine` confirms match; returns `{ ok, message }` so the form can show both success and
      errors
- [x] `src/app/profile/ChangePasswordForm.tsx` — `useActionState`; clears inputs on success;
      auto-closes modal after 1.4 s via `onSuccess` callback
- [x] `src/app/profile/ChangePasswordModal.tsx` — div-based modal with `shadow-panel`; ESC key +
      outside-click close; "Change password" button lives in the Security card on `/profile`
- [x] `src/app/profile/page.tsx` — initials avatar (role-coloured), read-only Account card (name /
      email / role), Security card with modal trigger; note directing name/email changes to admin
- [x] `src/proxy.ts` — added `/profile` guard; redirects unauthenticated users to `/login`
- [x] `src/components/UserMenu.tsx` — client dropdown: avatar + name + animated chevron; dropdown
      shows identity header, "Profile settings" link, divider, "Sign out" form; closes on ESC /
      outside click
- [x] `src/components/Header.tsx` — replaced inline Link + sign-out form with `<UserMenu />`;
      `signOut` moved to `src/app/actions.ts` so the client component can reference it
- [x] `src/lib/users/service.test.ts` — 5 new tests for `changeMyPassword`: user-not-found,
      wrong-password (no DB write), success (verifies `compare` + `hash` + `update` args),
      identity-from-session (userId comes from session, not caller)

### Password change security hardening — 2026-05-21

_Six findings from a dedicated security review: bcrypt cost 12, JWT eviction, rate limiting, HSTS headers, consolidated error messages, dirty-state modal guard._

Triggered by a dedicated security review of the password change flow. Six findings addressed:

| #   | Severity | Finding                                                                        | Fix                                                                                                                                                             |
| --- | -------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | High     | bcrypt cost factor was 10; spec requires ≥ 12                                  | `bcrypt.hash(newPassword, 12)` in `service.ts`                                                                                                                  |
| 2   | High     | Stateless JWT not invalidated after password change                            | `ChangePasswordForm` calls `signOut({ callbackUrl: "/login" })` from `next-auth/react` after 1.4 s success flash                                                |
| 3   | High     | No rate limiting on `changePasswordAction`                                     | In-process sliding-window counter: 5 attempts / 15 min keyed on `userId`; reset on success                                                                      |
| 4   | Medium   | No HSTS or security headers                                                    | `headers()` added to `next.config.ts`: HSTS (2 yr), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`                               |
| 5   | Low      | `"User not found"` vs `"Current password is incorrect"` leaked distinct states | Both branches throw `"Invalid credentials"`; `service.test.ts` updated accordingly                                                                              |
| 6   | Low      | Backdrop / ESC / ✕ close discards unsaved input silently                       | `ChangePasswordModal` tracks `isDirty` via `onDirtyChange` prop from `ChangePasswordForm`; all close paths call `window.confirm("Discard changes?")` when dirty |

- [x] `src/lib/users/service.ts` — bcrypt cost 10 → 12; error messages consolidated to
      `"Invalid credentials"`
- [x] `src/app/profile/actions.ts` — in-process rate limiter added; success message updated to
      `"Password updated. Signing you out…"`
- [x] `src/app/profile/ChangePasswordForm.tsx` — removed `onSuccess` prop; calls `signOut` after 1.4
      s on success; added `onDirtyChange` prop; `<form onChange>` marks dirty
- [x] `src/app/profile/ChangePasswordModal.tsx` — tracks `isDirty`; all close paths guarded with
      `window.confirm` when dirty; resets dirty on open
- [x] `next.config.ts` — `headers()` export with 4 security response headers
- [x] `src/lib/users/service.test.ts` — updated error message assertion (`/invalid credentials/i`);
      updated bcrypt cost assertion (12)

### Vitest unit tests — 2026-05-20

_169 passing tests across 6 files; Prisma mocked — no DB needed in CI._

- [x] 6 test files, 169 passing tests (Prisma mocked via `vi.mock` — no DB required)
- [x] `fsm.test.ts` — all valid transitions, role-rank gates, error messages
- [x] `assertions.test.ts` — error classes, all 5 assertion functions, SUPER bypass, cross-team
      blocks
- [x] `service.test.ts` (tickets) — role guards, `isInternal` filter, `$transaction` for
      StatusEvent, cross-team isolation
- [x] `service.test.ts` (users) — role guard, self-edit guard, SUPER role rejection, requesterType
      defaulting
- [x] `service.test.ts` (categories) — slug generation rules, has-tickets guard, cross-team guard
- [x] `service.test.ts` (attachments) — MIME allowlist, size guard, cross-team isolation, field
      persistence

### Playwright E2E — 2026-05-21

_7 specs covering requester, support, manager, cross-team isolation, login rate limiting, and desk search._

- [x] `e2e/requester.spec.ts` — login → create ticket → appears in My tickets list
- [x] `e2e/support.spec.ts` — assign to self · post internal note · OPEN → IN_PROGRESS transition
- [x] `e2e/manager.spec.ts` — full FSM cycle: IN_PROGRESS → ESCALATED → IN_PROGRESS → RESOLVED →
      CLOSED → OPEN (reopen)
- [x] `e2e/isolation.spec.ts` — Team B support cannot access Team A ticket by ID; 404, no redirect
      to login
- [x] Heading assertions updated to match current tokutei ginou seed subjects

### Login rate limiting — 2026-05-21

_In-process sliding-window counter on the credentials endpoint: 5 attempts / 15-min window keyed on email, blocks before bcrypt runs._

- [x] `src/app/login/actions.ts` — in-process sliding-window counter: 5 attempts / 15-minute window
      keyed on `email.toLowerCase()`; checked before `signIn()` so bcrypt is never called on a
      blocked request; reuses the same Map-based pattern as the password-change rate limiter
- [x] `e2e/login-rate-limit.spec.ts` — submits MAX_ATTEMPTS + 1 bad attempts using a non-existent
      email (no real account locked); verifies the final response is the rate-limit message; handles
      re-runs within the same window gracefully

### Cursor-based pagination — 2026-05-21

_`cursor`/`limit` on both ticket lists, "Load more" client component, server action for subsequent pages._

- [x] `src/lib/tickets/service.ts` — replaced offset `page`/`pageSize` with `cursor`/`limit` in both
      `listDeskTickets` and `listMyTickets`; both now return `{ items, nextCursor }`; fetches
      `limit + 1` rows — if the extra row is present, slices to `limit` and sets `nextCursor` to the
      last item's `id`; offset-based `skip`/`take` removed to avoid stale-page issues on concurrent
      inserts/deletes
- [x] `src/app/desk/actions.ts` — `loadMoreDeskTickets` server action; re-derives session and
      `viewToFilters` on each call so the cursor fetch is as authorised as the initial render
- [x] `src/app/desk/DeskTicketList.tsx` — client component; receives `initialItems`/`initialCursor`
      from the server component; appends pages to local state on "Load more"; resets on view change
      via `key={view}`
- [x] `src/app/desk/page.tsx` — simplified to fetch first page and pass `items`/`nextCursor`/`view`
      to `DeskTicketList`
- [x] `src/app/tickets/actions.ts` — `loadMoreMyTickets` server action
- [x] `src/app/tickets/TicketList.tsx` — same client component pattern for the requester list
- [x] `src/app/tickets/page.tsx` — updated to use new `listMyTickets` signature and `TicketList`
- [x] `src/lib/tickets/service.test.ts` — 6 new tests covering `nextCursor: null` for short result
      sets, cursor slicing to `limit`, and `cursor`/`skip:1` passthrough to `findMany`; total now
      164

### Ticket search — 2026-05-21

_Optional `q` on `listDeskTickets` filtering subject/body via `ILIKE`, debounced uncontrolled input in desk sidebar._

- [x] `src/lib/tickets/service.ts` — `q` param added to `ListDeskSchema`; `OR: [{ subject ILIKE },
      { body ILIKE }]` filter spread into `where` only when `q` is present; always scoped to
      `teamId`
- [x] `src/app/desk/actions.ts` — `loadMoreDeskTickets` accepts optional `query` param and forwards
      it as `q` so subsequent cursor pages respect the active search
- [x] `src/app/desk/DeskTicketList.tsx` — accepts `query` prop; passes it to `loadMoreDeskTickets`
      on "Load more"
- [x] `src/app/desk/page.tsx` — reads `q` from `searchParams`; passes to service and
      `DeskTicketList`; `key` now includes `q` so the list resets when search changes
- [x] `src/components/DeskSidebar.tsx` — uncontrolled search input; 300 ms debounce via `useRef`
      timer; `router.push` updates URL with `?q=`; `key={currentQ}` on the input resets it when the
      committed URL query changes; nav links preserve `q` across view switches
- [x] `src/lib/tickets/service.test.ts` — 2 new tests: OR filter present when `q` given; OR filter
      absent when `q` absent; total now 166
- [x] `e2e/search.spec.ts` — 2 tests: nonsense query shows "No tickets here"; clearing input
      restores results; total E2E specs now 7
- [x] `.gitignore` — added `/playwright-report` and `/test-results` (build artifacts; not for the
      repo)

### File attachments — 2026-05-21

_`Attachment` model (bytea), 1 MB limit, server-side MIME allowlist (prevents stored XSS), browser compression, file picker, image thumbnails, PDF links._

- [x] `prisma/schema.prisma` — `Attachment` model: `id`, `ticketId`, `commentId?`, `filename`,
      `mimeType`, `sizeBytes`, `data Bytes`, `createdAt`; relations to `Ticket` and `Comment`
- [x] `src/lib/attachments/service.ts` — `addAttachment` (size guard + MIME allowlist + ticket auth
      check + DB write) and `getAttachment` (ticket auth check); `MAX_BYTES = 1_000_000`; server-side
      `ALLOWED_MIME_TYPES` allowlist (`image/jpeg`, `image/png`, `image/webp`, `application/pdf`) to
      prevent XSS via `Content-Type` spoofing on the serve route
- [x] `src/app/api/attachments/[id]/route.ts` — authenticated GET; returns `data` bytes with stored
      `Content-Type`, `Content-Disposition: inline`, `Cache-Control: private, max-age=3600`
- [x] `src/lib/attachments/compress.ts` — browser-only Canvas API compression; binary-search quality
      (0.05–0.92), up to 4 resolution passes; outputs WebP (Chrome/Edge/Firefox) or JPEG (Safari);
      950 KB target to stay under the 1 MB server limit
- [x] `src/components/FilePicker.tsx` — uncontrolled file input; validates with `validateFile()`,
      compresses with `compressImage()`; clears on form reset
- [x] `src/components/AttachmentList.tsx` — renders image thumbnails (`<img h-24>`) and PDF/file
      download links; `eslint-disable` for `@next/next/no-img-element` (valid — dynamic attachment
      content can't use `<Image>`)
- [x] `next.config.ts` — `serverActions.bodySizeLimit: '3mb'` raised from default 1 MB to allow
      browser-compressed uploads (pre-compression source may be up to ~2 MB)
- [x] `src/lib/attachments/service.test.ts` — 15 tests: MIME allowlist (3 tests), size guard (2),
      ticket-not-found, cross-team isolation (2), SUPER bypass, field persistence (2),
      `getAttachment` not-found / cross-team / teams-match / REQUESTER own vs other

### Role-aware navigation + manager all-tickets view — 2026-05-22

_Per-role header links, responsive hamburger, `/admin/tickets` with full history and status filter._

- [x] `src/components/Header.tsx` — `navLinksForRole(role)` derives nav links from server session;
      passes them to `NavMenu`; Manager gets Dashboard + All Tickets + Queue; Support gets Queue;
      Requester gets My Tickets; Admin gets Dashboard; Super gets Teams
- [x] `src/components/NavMenu.tsx` — client component; `hidden sm:flex` for inline desktop links;
      `sm:hidden` hamburger dropdown on mobile, styled to match `UserMenu` panel
- [x] `src/app/admin/tickets/page.tsx` — Manager+ all-tickets page; reads `?status` and `?q` params;
      asserts MANAGER/ADMIN/SUPER role before fetching
- [x] `src/app/admin/tickets/actions.ts` — `loadMoreAllTickets` server action for cursor pagination;
      re-asserts role on each call
- [x] `src/app/admin/tickets/AllTicketList.tsx` — cursor-paginated client list; carries status/query
      filters through to subsequent pages
- [x] `src/app/admin/tickets/TicketStatusFilter.tsx` — status pill filters + debounced search;
      updates URL without full navigation
- [x] `src/app/admin/AdminNav.tsx` — added "All Tickets" tab
- [x] `src/lib/tickets/service.ts` — default page size 25 → 10

### Support self-assign fix — 2026-05-22

_Regression: prior PR over-restricted `AssignForm` to Manager+ only, violating the SPEC._

- [x] `src/app/desk/[id]/AssignForm.tsx` — replaced `canEdit: boolean` prop with `userId`/`role`;
      Support sees select filtered to themselves only; Manager+ sees full team list; Requester sees
      read-only text
- [x] `src/app/desk/[id]/page.tsx` — passes `userId` and `role` to `AssignForm`
- [x] `e2e/support.spec.ts` — restored to login as Support for assign step (self-assign now works)

### Unit test audit — 2026-05-22

_51 new tests; all service layers now have full business-rule coverage._

- [x] `src/lib/tickets/service.test.ts` — added `setPriority` (role guard, cross-team, success);
      `createTicket` Zod validation branches (missing categoryId, empty subject/body) and success
      path (teamId/userId scoping); `TicketPriority` imported
- [x] `src/lib/users/service.test.ts` — added teamId scoping assertions for `listTeamMembers` and
      `listTeamUsers`
- [x] `src/lib/admin/service.test.ts` _(new)_ — `getDashboardMetrics`: role guard (SUPPORT/REQUESTER
      rejected; MANAGER/ADMIN allowed), teamId scoping on all queries, status count zero-filling,
      avgResponseHours calculation (null / single ticket / average across multiple), topAssignees
      name resolution and teamId-scoped user lookup
- [x] `src/lib/teams/service.test.ts` _(new)_ — all 5 functions: role guards (non-SUPER rejected),
      `createTeam` Zod validation + duplicate slug error, `getTeamDetail` not-found,
      `createUserInTeam` Zod validation + password hashing + requesterType defaulting +
      teamId scoping + duplicate email error, `seedDemoUsers` team-not-found + full create (5 users,
      slug-based emails) + partial skip on P2002; total tests 179 → 230 across 8 files

### E2E fixes — 2026-05-22

_Three root causes fixed; all 7 specs pass cleanly._

- [x] `src/components/UserMenu.tsx` — added `data-testid="user-menu-trigger"` to distinguish it from
      the `NavMenu` hamburger button (both had `aria-haspopup="true"`)
- [x] `e2e/helpers.ts` — updated login assertion to `[data-testid="user-menu-trigger"]`
- [x] `src/app/login/actions.ts` — `DISABLE_RATE_LIMIT=1` env var bypasses the in-process counter
- [x] `playwright.config.ts` — `webServer.env: { DISABLE_RATE_LIMIT: "1" }` so the dev server
      started by Playwright never blocks test logins
- [x] `prisma/seed-bulk-tickets.ts` _(new)_ — seeds 60 minimal tickets on team "demo" spread across
      all statuses/priorities; stable IDs; safe to re-run
- [x] `package.json` — added `db:seed:tickets` script

---

## Not in scope for v1

Email/Slack notifications, i18n (supporting all relevant locales — EN/JA/ID/VI/MY — is a larger
scope increase than UI-chrome translation alone justifies), self-service signup, SLA timers,
real-time push, full-text search, cross-team transfer, mobile app, GraphQL, multi-region
active/active.
