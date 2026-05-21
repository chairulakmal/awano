# Awano — Build Plan

**Current state (2026-05-21):** All application routes complete. Profile / settings page live at
`/profile` (password change only; name/email admin-managed). `UserMenu` dropdown in header replaces
bare sign-out button. Password change security hardening complete (bcrypt cost 12, session
invalidation, rate limiting, security headers). Unit tests complete (158 passing). Playwright E2E
suite written (4 specs). Auth.js URLSearchParams bug fixed. Deployed on Railway. Branch → PR → main
workflow active; direct pushes to `main` blocked by GitHub branch protection.

---

## Completed

### Auth foundation — 2026-05-14

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

- [x] `src/lib/tickets/fsm.ts` — `assertTransition` + `getAllowedTransitions`; pure, no Prisma; role
      rank table drives both functions
- [x] `src/lib/tickets/service.ts` — `createTicket`, `listMyTickets`, `listDeskTickets`,
      `getTicket`, `assignTicket`, `transitionStatus`, `setPriority`, `postComment`; each follows
      Zod → assert auth → Prisma; `transitionStatus` wraps ticket update + `StatusEvent` in a single
      transaction

### Requester routes — 2026-05-20

- [x] `src/app/tickets/layout.tsx` — shared layout with Header
- [x] `src/app/tickets/page.tsx` — My tickets list with status badges
- [x] `src/app/tickets/new/page.tsx` + `NewTicketForm.tsx` + `actions.ts` — create ticket flow
- [x] `src/app/tickets/[id]/page.tsx` + `CommentForm.tsx` + `actions.ts` — thread view + reply form

### Desk routes — 2026-05-20

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

- [x] `.github/workflows/ci.yml` — runs lint → tsc → vitest → next build on every push and PR to
      `main`; no Postgres needed (service tests mock Prisma)
- [x] `.github/pull_request_template.md` — What / Why / Test plan checklist on every PR
- [x] GitHub branch protection on `main` — requires PR, requires `ci` job to pass, no direct push,
      no force push (configured in GitHub Settings → Branches after first CI merge)

### Deployment — 2026-05-21

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

- [x] `src/lib/users/service.ts` — added `changeMyPassword`; verifies current password with bcrypt
      before hashing and saving the new one; uses `session.userId` as the identity anchor
- [x] `src/app/profile/actions.ts` — `changePasswordAction`; Zod schema: `min(15)` on new password,
      `refine` confirms match; returns `{ ok, message }` so the form can show both success and errors
- [x] `src/app/profile/ChangePasswordForm.tsx` — `useActionState`; clears inputs on success;
      auto-closes modal after 1.4 s via `onSuccess` callback
- [x] `src/app/profile/ChangePasswordModal.tsx` — div-based modal with `shadow-panel`; ESC key +
      outside-click close; "Change password" button lives in the Security card on `/profile`
- [x] `src/app/profile/page.tsx` — initials avatar (role-coloured), read-only Account card
      (name / email / role), Security card with modal trigger; note directing name/email changes to admin
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

Triggered by a dedicated security review of the password change flow. Six findings addressed:

| # | Severity | Finding | Fix |
|---|----------|---------|-----|
| 1 | High | bcrypt cost factor was 10; spec requires ≥ 12 | `bcrypt.hash(newPassword, 12)` in `service.ts` |
| 2 | High | Stateless JWT not invalidated after password change | `ChangePasswordForm` calls `signOut({ callbackUrl: "/login" })` from `next-auth/react` after 1.4 s success flash |
| 3 | High | No rate limiting on `changePasswordAction` | In-process sliding-window counter: 5 attempts / 15 min keyed on `userId`; reset on success |
| 4 | Medium | No HSTS or security headers | `headers()` added to `next.config.ts`: HSTS (2 yr), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` |
| 5 | Low | `"User not found"` vs `"Current password is incorrect"` leaked distinct states | Both branches throw `"Invalid credentials"`; `service.test.ts` updated accordingly |
| 6 | Low | Backdrop / ESC / ✕ close discards unsaved input silently | `ChangePasswordModal` tracks `isDirty` via `onDirtyChange` prop from `ChangePasswordForm`; all close paths call `window.confirm("Discard changes?")` when dirty |

- [x] `src/lib/users/service.ts` — bcrypt cost 10 → 12; error messages consolidated to `"Invalid credentials"`
- [x] `src/app/profile/actions.ts` — in-process rate limiter added; success message updated to `"Password updated. Signing you out…"`
- [x] `src/app/profile/ChangePasswordForm.tsx` — removed `onSuccess` prop; calls `signOut` after 1.4 s on success; added `onDirtyChange` prop; `<form onChange>` marks dirty
- [x] `src/app/profile/ChangePasswordModal.tsx` — tracks `isDirty`; all close paths guarded with `window.confirm` when dirty; resets dirty on open
- [x] `next.config.ts` — `headers()` export with 4 security response headers
- [x] `src/lib/users/service.test.ts` — updated error message assertion (`/invalid credentials/i`); updated bcrypt cost assertion (12)

### Vitest unit tests — 2026-05-20

- [x] 5 test files, 142 passing tests (real DB, no mocks)
- [x] `fsm.test.ts` — all valid transitions, role-rank gates, error messages
- [x] `assertions.test.ts` — error classes, all 5 assertion functions, SUPER bypass, cross-team
      blocks
- [x] `service.test.ts` (tickets) — role guards, `isInternal` filter, `$transaction` for
      StatusEvent, cross-team isolation
- [x] `service.test.ts` (users) — role guard, self-edit guard, SUPER role rejection, requesterType
      defaulting
- [x] `service.test.ts` (categories) — slug generation rules, has-tickets guard, cross-team guard

### Playwright E2E — 2026-05-21

- [x] `e2e/requester.spec.ts` — login → create ticket → appears in My tickets list
- [x] `e2e/support.spec.ts` — assign to self · post internal note · OPEN → IN_PROGRESS transition
- [x] `e2e/manager.spec.ts` — full FSM cycle: IN_PROGRESS → ESCALATED → IN_PROGRESS → RESOLVED →
      CLOSED → OPEN (reopen)
- [x] `e2e/isolation.spec.ts` — Team B support cannot access Team A ticket by ID; 404, no redirect
      to login
- [x] **Fix needed:** spec files reference old seed ticket subjects; update heading assertions to
      match current seed data

---

## What to build next

Ordered by urgency and value. XS/S/M is rough engineering effort.

---

## Ordered queue

| #     | What                               | Why                                                             | Effort |
| ----- | ---------------------------------- | --------------------------------------------------------------- | ------ |
| ~~1~~ | ~~**Fix E2E subject strings**~~    | ~~Specs fail on current seed; broke when tickets were renamed~~ | ~~XS~~ |
| ~~2~~ | ~~**GitHub Actions CI pipeline**~~ | ~~Catch regressions on every push, not just at deploy time~~    | ~~S~~  |
| ~~3~~ | ~~**Profile / settings page**~~    | ~~Missing user-facing feature; required for password changes~~  | ~~S~~  |
| 4     | **Login rate limiting**            | Brute-force protection on the credentials endpoint              | S      |
| 5     | **Cursor-based pagination**        | Ticket lists currently load unbounded rows                      | M      |
| 6     | **Ticket search**                  | No way to find a ticket without scrolling the full list         | M      |
| 7     | **File attachments (bytea)**       | Requesters can't share screenshots or documents with support    | M      |

### Detail

**1 — Fix E2E subject strings (XS)**  
`support.spec.ts` and `manager.spec.ts` assert heading text from the old generic seed (e.g. "Cannot
log in to my account"). The seed was later replaced with tokutei ginou scenarios. Update the heading
assertions to match the current `seed-ticket-a1` and `seed-ticket-a2` subjects, or switch to
`data-testid` selectors that are decoupled from seed content.

**2 — GitHub Actions CI (S)**  
`.github/workflows/ci.yml` running on every push and PR:
`npm ci → prisma generate → lint → tsc --noEmit → vitest run → next build`. Currently the only
automated check is Railway's build step, which runs after merge. Failures should block the PR, not
surface post-deploy.

**~~3 — Profile / settings page (S)~~** ✓ done  
Password change only at `/profile`. Name and email are admin-managed — email is the tenant-scoped
identity anchor (`@@unique([teamId, email])`) and changing it is a credential operation, not a display
preference. Password form lives in a modal (deliberate friction to prevent accidental submission).
15-character minimum, no complexity rules (NIST SP 800-63B). `UserMenu` dropdown in the header
replaces the bare name link + sign-out button.

**4 — Login rate limiting (S)**  
Per-IP and per-email attempt counter on the credentials sign-in path. In Next.js 16 the natural home
is `proxy.ts` using an in-process LRU for a single-replica deployment, or Upstash Redis if the
service scales horizontally. Block for a fixed window after N failures; return a 429 before the DB
is touched.

**5 — Cursor-based pagination (M)**  
`listDeskTickets` and `listMyTickets` currently issue an unbounded `findMany`. Add `cursor` +
`limit` params and a `hasMore` flag to the return shape; update the desk page with a "Load more"
trigger. Offset-based (`skip`) is avoided because it produces incorrect results when rows are
inserted or deleted between pages.

**6 — Ticket search (M)**  
No mechanism exists to find a specific ticket without scrolling the full filtered list. Add an
optional `q` param to `listDeskTickets` that filters on `subject` and `body` using PostgreSQL
`ILIKE`, always scoped to `teamId`. Expose a search input in the desk sidebar.

**7 — File attachments via bytea (M)**  
Requesters currently have no way to attach screenshots or documents to a ticket. Store file content
as `bytea` in a new `Attachment` model (ticketId, filename, mimeType, sizeBytes, data). Hard limit:
1 MB per file, enforced at the server action boundary before the DB write. Serve files through
`/api/attachments/[id]` with `Content-Type` from the stored MIME type. Add a file picker to the
ticket creation form and the comment form; render thumbnails for images in the thread view. Revisit
with Cloudflare R2 if per-ticket storage cost becomes significant.

**Required config:** set `serverActions.bodySizeLimit: '3mb'` in `next.config` before implementing —
the default 1 MB limit silently rejects multipart uploads before the action runs.

---

## Not in scope for v1

Email/Slack notifications, i18n (supporting all relevant locales — EN/JA/ID/VI/MY — is a larger
scope increase than UI-chrome translation alone justifies), self-service signup, SLA timers,
real-time push, full-text search, cross-team transfer, mobile app, GraphQL, multi-region
active/active.
