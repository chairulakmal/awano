# Awano — Build Plan

**Current state (2026-05-19):** Auth foundation complete — Credentials provider, middleware route
guards, auth assertions, login page, Prisma singleton, and seed script are all in place. No
application routes yet.

---

## Completed

### Auth foundation

- [x] Packages: `next-auth@beta`, `bcryptjs`, `zod`
- [x] `src/auth.ts` — Credentials provider; team slug → teamId; SUPER path; bcrypt verify; JWT payload
- [x] `middleware.ts` — Role-gated route guards with `roleHome` redirect for post-login landing
- [x] `src/lib/auth/assertions.ts` — `assertAuthenticated`, `assertRole`, `assertSameTeam`, `assertCanViewTicket`, `assertCanUpdateTicket`
- [x] `src/app/login/page.tsx` — Server component + `LoginForm` client form + server action
- [x] `src/lib/db.ts` — Prisma singleton
- [x] `prisma/seed.ts` — 1 super, 2 teams (acme, beta), 9 users, 4 tickets across statuses

---

## What to build next: Service foundation

Auth is done. Before touching any route, lay the service-layer primitives every route depends on.

### Step 1 — Ticket FSM (`src/lib/tickets/fsm.ts`)

Encode the state machine from the spec. Pure validation — no Prisma calls here.

```ts
type Transition = { from: TicketStatus; to: TicketStatus; minRole: Role };

const TRANSITIONS: Transition[] = [ ... ];

export function assertTransition(from: TicketStatus, to: TicketStatus, role: Role): void;
export function getAllowedTransitions(from: TicketStatus, role: Role): TicketStatus[];
```

`transitionStatus` (in the service layer) calls `assertTransition`, then writes the `StatusEvent`.

### Step 2 — Ticket service (`src/lib/tickets/service.ts`)

```ts
createTicket(payload, session)
listMyTickets(session)
listDeskTickets(filters, session)
getTicket(id, session)
assignTicket(id, assigneeId, session)
transitionStatus(id, to, session)
postComment(id, body, isInternal, session)
```

Each function: validate with Zod → assert auth → Prisma → return typed result.

---

## After service foundation — ordered queue

| #   | What                                                                   | Why first                                          |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| 3   | Requester routes (`/tickets`, `/tickets/new`, `/tickets/[id]`)         | Simplest RBAC path; good smoke test for auth       |
| 4   | Desk routes (`/desk`, `/desk/[id]`)                                    | Core support workflow; exercises FSM + StatusEvent |
| 5   | Admin routes (`/admin/users`, `/admin/categories`, `/admin/dashboard`) | Manager-only; lower priority                       |
| 6   | Super routes (`/super/teams`, `/super/teams/[id]`)                     | Needed for provisioning but not for demo           |
| 7   | Vitest unit tests (FSM, assertions, service functions)                 | Spec requires; unblock after service layer exists  |
| 8   | Playwright E2E                                                         | Last; requires all routes working                  |

---

## Not in scope for v1

Email/Slack notifications, self-service signup, SLA timers, real-time push, full-text search,
cross-team transfer, mobile app.
