# Awano — Build Plan

**Current state (2026-05-20):** Admin routes complete. Super routes are next.

---

## Completed

### Auth foundation — 2026-05-14

- [x] Packages: `next-auth@beta`, `bcryptjs`, `zod`
- [x] `src/auth.ts` — Credentials provider; team slug → teamId; SUPER path; bcrypt verify; JWT payload
- [x] `src/proxy.ts` — Role-gated route guards (Next.js 16 proxy convention); `roleHome` post-login redirect; replaced deprecated `middleware.ts`
- [x] `src/lib/auth/assertions.ts` — `assertAuthenticated`, `assertRole`, `assertSameTeam`, `assertCanViewTicket`, `assertCanUpdateTicket`
- [x] `src/app/login/page.tsx` — Server component + `LoginForm` client form + server action
- [x] `src/lib/db.ts` — Prisma singleton
- [x] `prisma/seed.ts` — 1 super, 2 teams (acme, beta), 9 users, 4 tickets across statuses

### Service foundation — 2026-05-20

- [x] `src/lib/tickets/fsm.ts` — `assertTransition` + `getAllowedTransitions`; pure, no Prisma; role rank table drives both functions
- [x] `src/lib/tickets/service.ts` — `createTicket`, `listMyTickets`, `listDeskTickets`, `getTicket`, `assignTicket`, `transitionStatus`, `postComment`; each follows Zod → assert auth → Prisma; `transitionStatus` wraps ticket update + `StatusEvent` in a single transaction

### Requester routes — 2026-05-20

- [x] `src/app/tickets/layout.tsx` — shared layout with Header
- [x] `src/app/tickets/page.tsx` — My tickets list with status badges
- [x] `src/app/tickets/new/page.tsx` + `NewTicketForm.tsx` + `actions.ts` — create ticket flow
- [x] `src/app/tickets/[id]/page.tsx` + `CommentForm.tsx` + `actions.ts` — thread view + reply form

### Desk routes — 2026-05-20

- [x] `src/lib/users/service.ts` — `listTeamMembers` for assignee dropdown
- [x] `src/lib/tickets/service.ts` — added `setPriority`; `null` assigneeId filter for unassigned tab
- [x] `src/app/desk/layout.tsx` — wider layout (max-w-5xl)
- [x] `src/app/desk/page.tsx` — tabbed inbox (Unassigned · Mine · Open · Escalated) via `?view=` param
- [x] `src/app/desk/[id]/page.tsx` — 2-column detail: body + thread + reply form / status + assignee + priority + timeline
- [x] `src/app/desk/[id]/StatusForm.tsx` — status transitions with `useOptimistic` + `useTransition`
- [x] `src/app/desk/[id]/AssignForm.tsx` + `PriorityForm.tsx` + `DeskCommentForm.tsx` — sidebar controls; internal note toggle

### Admin routes — 2026-05-20

- [x] `src/lib/users/service.ts` — added `listTeamUsers`, `changeUserRole`
- [x] `src/lib/categories/service.ts` — `listCategories`, `createCategory` (auto-slug), `deleteCategory` (guards against ticket references)
- [x] `src/lib/admin/service.ts` — `getDashboardMetrics` (status counts, unassigned, avg first response, opened/closed 30d, top assignees)
- [x] `src/app/admin/layout.tsx` + `AdminNav.tsx` — shared layout with active-link nav
- [x] `src/app/admin/users/` — users table with per-row role change (`ChangeRoleForm`); self-edit disabled
- [x] `src/app/admin/categories/` — categories table + `NewCategoryForm`; delete only when ticket count = 0
- [x] `src/app/admin/dashboard/` — 4 stat cards + status breakdown table + top assignees list

---

### Super routes — 2026-05-20

- [x] `src/lib/teams/service.ts` — `listTeams`, `createTeam`, `getTeamDetail`, `createUserInTeam`, `seedDemoUsers`
- [x] `src/app/super/layout.tsx` + `SuperNav.tsx` — shared layout with active-link nav
- [x] `src/app/super/teams/` — teams table + `NewTeamForm` (name + slug + notes); redirects to detail on create
- [x] `src/app/super/teams/[id]/` — team detail: users table with role badges + breadcrumb; `SeedDemoButton` (creates 5 standard demo users, reports count); `+ Add user` link
- [x] `src/app/super/teams/[id]/users/new/` — create user form: name, email, password, role dropdown, conditional requester type; redirects back to team on success

---

## What to build next: Tests

All routes complete. Testing is next.

---

## Ordered queue

| #   | What                                                   | Why first                                         |
| --- | ------------------------------------------------------ | ------------------------------------------------- |
| 1   | Vitest unit tests (FSM, assertions, service functions) | Spec requires; service layer is stable now        |
| 2   | Playwright E2E                                         | Last; requires all routes working                 |

---

## Not in scope for v1

Email/Slack notifications, self-service signup, SLA timers, real-time push, full-text search,
cross-team transfer, mobile app.
