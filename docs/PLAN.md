# Awano — Build Plan

**Current state (2026-05-20):** Desk routes complete. Admin routes are next.

---

## Completed

### Auth foundation — 2026-05-14

- [x] Packages: `next-auth@beta`, `bcryptjs`, `zod`
- [x] `src/auth.ts` — Credentials provider; team slug → teamId; SUPER path; bcrypt verify; JWT payload
- [x] `middleware.ts` — Role-gated route guards with `roleHome` redirect for post-login landing
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

---

## What to build next: Admin routes

Desk routes complete and exercising FSM + audit trail. Admin routes are next.

---

## Ordered queue

| #   | What                                                                   | Why first                                          |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Admin routes (`/admin/users`, `/admin/categories`, `/admin/dashboard`) | Manager-only; lower priority                       |
| 2   | Super routes (`/super/teams`, `/super/teams/[id]`)                     | Needed for provisioning but not for demo           |
| 3   | Vitest unit tests (FSM, assertions, service functions)                 | Spec requires; unblock after service layer exists  |
| 4   | Playwright E2E                                                         | Last; requires all routes working                  |

---

## Not in scope for v1

Email/Slack notifications, self-service signup, SLA timers, real-time push, full-text search,
cross-team transfer, mobile app.
