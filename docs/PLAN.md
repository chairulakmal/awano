# Awano — Build Plan

**Current state (2026-05-21):** All application routes complete. Unit tests complete. Playwright E2E
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
      `AUTH_SECRET` + `AUTH_URL` set in Railway dashboard
- [x] `trustHost: true` in `auth.config.ts` — Railway terminates TLS at its load balancer; without
      this flag Auth.js cannot resolve the public origin from forwarded headers and falls back to
      `pages.signIn` after every login, redirecting users to the bare `/login` page instead of their
      workspace
- [x] Live at `awano.chairulakmal.com`

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
| 3     | **Profile / settings page**        | Missing user-facing feature; required for password changes      | S      |
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

**3 — Profile / settings page (S)**  
Any authenticated user can update their own `name`, `email`, and `password` at `/profile`. Service
constraint: a user may only edit their own record. Password change requires the current password for
verification. The `/profile` route is accessible to all roles; no team scoping needed since it only
touches the session owner's row.

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
