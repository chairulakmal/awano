# Awano — Build Plan

**Current state (2026-05-19):** Prisma schema complete, one migration applied, app is default
Next.js scaffold. No auth, no routes, no service layer.

---

## What to build next: Auth foundation

Everything else — routes, server actions, service layer — depends on a verified session. Auth is the
single most-blocking dependency. Build it first.

### Step 1 — Install missing packages

```bash
npm install next-auth@beta bcryptjs zod
npm install -D @types/bcryptjs
```

### Step 2 — Auth.js config (`src/auth.ts`)

- Credentials provider: resolve `?team` slug → `teamId`, verify bcrypt hash
- Session callback: embed `userId`, `teamId`, `role`, `requesterType` into the JWT
- Extend `Session` type so TypeScript knows the full payload

### Step 3 — Middleware (`middleware.ts`)

Route guards using the session from Auth.js:

| Prefix       | Required role                 |
| ------------ | ----------------------------- |
| `/desk/*`    | `SUPPORT \| MANAGER \| ADMIN` |
| `/admin/*`   | `MANAGER \| ADMIN`            |
| `/super/*`   | `SUPER`                       |
| `/tickets/*` | `REQUESTER`                   |

Unauthenticated requests redirect to `/login?team={slug}` (preserve the slug if available).

### Step 4 — Auth assertions (`src/lib/auth/assertions.ts`)

```ts
assertAuthenticated(session);
assertRole(session, allowedRoles);
assertSameTeam(session, resource);
assertCanViewTicket(session, ticket);
assertCanUpdateTicket(session, ticket);
```

Each throws a typed error (not `Error`) so server actions can convert it to the right HTTP status.

### Step 5 — Login page (`src/app/login/page.tsx`)

- Server component reads `?team` from the URL
- Client form: team slug (pre-filled if in URL), email, password
- Calls `signIn("credentials", ...)` from Auth.js

---

## After auth is done — ordered queue

| #   | What                                                                   | Why first                                              |
| --- | ---------------------------------------------------------------------- | ------------------------------------------------------ |
| 2   | FSM (`src/lib/tickets/fsm.ts`)                                         | `transitionStatus` depends on it; no UI needed to test |
| 3   | Prisma singleton (`src/lib/db.ts`)                                     | Needed before any service function                     |
| 4   | Seed (`prisma/seed.ts`)                                                | Unblocks manual testing of every route                 |
| 5   | Requester routes (`/tickets`, `/tickets/new`, `/tickets/[id]`)         | Simplest RBAC path; good smoke test for auth           |
| 6   | Desk routes (`/desk`, `/desk/[id]`)                                    | Core support workflow; exercises FSM + StatusEvent     |
| 7   | Admin routes (`/admin/users`, `/admin/categories`, `/admin/dashboard`) | Manager-only; lower priority                           |
| 8   | Super routes (`/super/teams`, `/super/teams/[id]`)                     | Needed for provisioning but not for demo               |
| 9   | Vitest unit tests (FSM, assertions, service functions)                 | Spec requires; unblock after service layer exists      |
| 10  | Playwright E2E                                                         | Last; requires all routes working                      |

---

## Not in scope for v1

Email/Slack notifications, self-service signup, SLA timers, real-time push, full-text search,
cross-team transfer, mobile app.
