# Awano — Build Plan

**Current state (2026-05-20):** Service foundation complete — FSM and ticket service are in place.
Requester routes are next.

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

---

## What to build next: Requester routes

Service layer is done. Start with requester routes — simplest RBAC path and a good smoke test for
auth and the service layer end-to-end.

---

## Ordered queue

| #   | What                                                                   | Why first                                          |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Requester routes (`/tickets`, `/tickets/new`, `/tickets/[id]`)         | Simplest RBAC path; good smoke test for auth       |
| 2   | Desk routes (`/desk`, `/desk/[id]`)                                    | Core support workflow; exercises FSM + StatusEvent |
| 3   | Admin routes (`/admin/users`, `/admin/categories`, `/admin/dashboard`) | Manager-only; lower priority                       |
| 4   | Super routes (`/super/teams`, `/super/teams/[id]`)                     | Needed for provisioning but not for demo           |
| 5   | Vitest unit tests (FSM, assertions, service functions)                 | Spec requires; unblock after service layer exists  |
| 6   | Playwright E2E                                                         | Last; requires all routes working                  |

---

## Not in scope for v1

Email/Slack notifications, self-service signup, SLA timers, real-time push, full-text search,
cross-team transfer, mobile app.
