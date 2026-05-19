# Awano — Engineering Design Doc

|                       |                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Status**            | Draft                                                                                                          |
| **Owner**             | Chairul Akmal                                                                                                  |
| **Last updated**      | 2026-05-19                                                                                                     |
| **Stack**             | Next.js 16 (App Router) · TypeScript (strict) · Prisma 7 · PostgreSQL · Auth.js v5 · Zod · Vitest · Playwright |
| **Deployment target** | Railway                                                                                                        |

---

## Overview

Awano is a multi-tenant support desk. External requesters (customers, recruiters, field agents)
submit tickets; support staff triage and respond; managers oversee the queue and authorize sensitive
actions. A super admin provisions isolated team workspaces.

---

## Goals

- Multi-tenant isolation: each team's tickets, users, and categories are fully separated.
- Role-based access control enforced server-side on every mutation.
- Full audit trail on ticket status transitions.
- Deployable demo with seeded accounts per team.

## Non-goals (v1)

- Email / Slack notifications (interface stubbed only)
- Self-service team signup
- SLA timers, CSAT, full-text search
- Real-time push (polling sufficient for v1)
- Cross-team ticket transfer
- Mobile app
- Object-capability (Ocaps) tokens — see Open Questions

---

## Roles & Permissions

| Role      | `role` value | `teamId` | Permissions                                                                                       |
| --------- | ------------ | -------- | ------------------------------------------------------------------------------------------------- |
| Requester | `REQUESTER`  | required | Create ticket; comment on own tickets; view own tickets only                                      |
| Support   | `SUPPORT`    | required | Team inbox; assign self/others; set status/priority; internal notes                               |
| Manager   | `MANAGER`    | required | All Support permissions + reassign any ticket; close/reopen; manage users & categories; dashboard |
| Admin     | `ADMIN`      | required | User invites; role changes; category CRUD within team                                             |
| Super     | `SUPER`      | `null`   | Create/update teams; seed users across teams; read-only access to all teams                       |

`REQUESTER` also carries a `requesterType`: `CUSTOMER | RECRUITER | FIELD_AGENT`.

### Permission rules

- `teamId` and `role` are derived from the session on every request; never accepted from the client.
- All queries on tenant-scoped models include `teamId` in the `WHERE` clause.
- Requesters: own tickets only; `isInternal: true` comments never returned.
- `ESCALATED` transition and reopening `CLOSED` tickets: `MANAGER+` only.
- Role changes and user deactivation: `MANAGER+` within the team.
- Team creation and first-user provisioning: `SUPER` only.

---

## Data Model

```
Team       (id, name, slug:unique, notes?, createdAt, updatedAt)
User       (id, teamId?, email, passwordHash, role, requesterType?, name?, createdAt, updatedAt)
Category   (id, teamId, name, slug, createdAt)
Ticket     (id, teamId, createdById, assigneeId?, categoryId, subject, body, status, priority, createdAt, updatedAt)
Comment    (id, ticketId, authorId, body, isInternal, createdAt)
StatusEvent(id, ticketId, actorId, fromStatus?, toStatus, note?, createdAt)
```

**Constraints**

| Model      | Constraint              |
| ---------- | ----------------------- |
| `User`     | `UNIQUE(teamId, email)` |
| `Team`     | `UNIQUE(slug)`          |
| `Category` | `UNIQUE(teamId, slug)`  |

**Indexes**

| Model         | Index                                                       |
| ------------- | ----------------------------------------------------------- |
| `Ticket`      | `(teamId, status)`, `(teamId, assigneeId)`, `(createdById)` |
| `Comment`     | `(ticketId, createdAt)`                                     |
| `StatusEvent` | `(ticketId, createdAt)`                                     |

Prisma client output: `src/generated/prisma`.

---

## Ticket State Machine

### States

`OPEN` · `IN_PROGRESS` · `WAITING_ON_REQUESTER` · `ESCALATED` · `RESOLVED` · `CLOSED`

### Valid transitions

| From                   | To                     | Min role  |
| ---------------------- | ---------------------- | --------- |
| `OPEN`                 | `IN_PROGRESS`          | `SUPPORT` |
| `IN_PROGRESS`          | `WAITING_ON_REQUESTER` | `SUPPORT` |
| `IN_PROGRESS`          | `ESCALATED`            | `MANAGER` |
| `IN_PROGRESS`          | `RESOLVED`             | `SUPPORT` |
| `WAITING_ON_REQUESTER` | `IN_PROGRESS`          | `SUPPORT` |
| `ESCALATED`            | `IN_PROGRESS`          | `MANAGER` |
| `RESOLVED`             | `CLOSED`               | `SUPPORT` |
| `RESOLVED`             | `IN_PROGRESS`          | `MANAGER` |
| `CLOSED`               | `OPEN`                 | `MANAGER` |

Transition logic lives in `src/lib/tickets/fsm.ts`. Every accepted transition writes a `StatusEvent`
row.

---

## Auth & Session

**Provider:** Auth.js v5, Credentials strategy. Passwords hashed with bcrypt (cost 12).

**Session:** Stateless JWT in httpOnly cookie.

```ts
type Session = {
  userId: string;
  teamId: string | null; // null for SUPER
  role: Role;
  requesterType?: RequesterType;
};
```

**Middleware route guards** (`middleware.ts`):

| Path prefix  | Required role                 |
| ------------ | ----------------------------- |
| `/desk/*`    | `SUPPORT \| MANAGER \| ADMIN` |
| `/admin/*`   | `MANAGER \| ADMIN`            |
| `/super/*`   | `SUPER`                       |
| `/tickets/*` | `REQUESTER`                   |

Login URL: `/login?team={slug}`. Team slug is resolved to `teamId` server-side before credential
verification.

---

## Service Layer

```
Server Action → src/lib/{domain}/service.ts → Prisma
```

Server Actions validate input (Zod), read session, then delegate to service functions. Service
functions enforce business rules and issue Prisma queries. No Prisma calls outside the service
layer.

**Authorization assertions** (`src/lib/auth/assertions.ts`):

```ts
assertAuthenticated(session);
assertRole(session, allowedRoles);
assertSameTeam(session, resource);
assertCanViewTicket(session, ticket);
assertCanUpdateTicket(session, ticket);
```

Each throws a structured error on failure. Called at the top of every Server Action.

---

## Route Map

| Route                         | Audience         | Purpose                                                          |
| ----------------------------- | ---------------- | ---------------------------------------------------------------- |
| `/login`                      | All              | Team slug + email + password                                     |
| `/tickets`                    | Requester        | My tickets                                                       |
| `/tickets/new`                | Requester        | Create ticket                                                    |
| `/tickets/[id]`               | Requester        | Thread (public comments); status read-only                       |
| `/desk`                       | Support, Manager | Inbox: Unassigned · Mine · Open · Escalated                      |
| `/desk/[id]`                  | Support, Manager | Assign · status · priority · replies · internal notes · timeline |
| `/admin/users`                | Manager, Admin   | Users in this team                                               |
| `/admin/categories`           | Manager, Admin   | Categories in this team                                          |
| `/admin/dashboard`            | Manager, Admin   | Team metrics                                                     |
| `/super/teams`                | Super            | List / create teams                                              |
| `/super/teams/[id]`           | Super            | Members · seed demo users · credential export                    |
| `/super/teams/[id]/users/new` | Super            | Create user in team                                              |

---

## Dashboard Metrics (`/admin/dashboard`)

All queries are team-scoped. Page is a Server Component.

| Metric                             | Query basis                                                               |
| ---------------------------------- | ------------------------------------------------------------------------- |
| Ticket count by status             | `GROUP BY status WHERE teamId = ?`                                        |
| Unassigned open tickets            | `WHERE assigneeId IS NULL AND status NOT IN (RESOLVED, CLOSED)`           |
| Avg time to first response         | `Ticket.createdAt` → first non-internal `Comment.createdAt` by `SUPPORT+` |
| Opened vs closed (last 30 days)    | `COUNT(Ticket.createdAt)` vs `COUNT(StatusEvent WHERE toStatus = CLOSED)` |
| Top assignees by open ticket count | `GROUP BY assigneeId` on open tickets                                     |

---

## Server Actions (representative)

| Action             | Min role     | Notes                                              |
| ------------------ | ------------ | -------------------------------------------------- |
| `createTicket`     | `REQUESTER`  | `teamId`, `createdById` from session               |
| `listMyTickets`    | `REQUESTER`  | Filtered to `createdById = session.userId`         |
| `listDeskTickets`  | `SUPPORT`    | Filtered to `teamId = session.teamId`              |
| `assignTicket`     | `SUPPORT`    | Assign to self; assign to other requires `MANAGER` |
| `transitionStatus` | `SUPPORT`    | Validated through FSM; writes `StatusEvent`        |
| `postComment`      | `REQUESTER+` | Requesters: own ticket, `isInternal: false` only   |
| `manageUsers`      | `MANAGER`    | Within same team                                   |
| `manageCategories` | `MANAGER`    | Within same team                                   |
| `createTeam`       | `SUPER`      |                                                    |
| `seedDemoUsers`    | `SUPER`      |                                                    |

---

## Non-functional Requirements

| Concern          | Requirement                                                                        |
| ---------------- | ---------------------------------------------------------------------------------- |
| TypeScript       | `strict: true`; no `any`; explicit return types on all Server Actions              |
| Input validation | Zod schema on every Server Action; `teamId`/`createdById`/`role` never from client |
| Tenant isolation | Every DB query on a tenant-scoped model includes `teamId`                          |
| Password storage | bcrypt, cost factor ≥ 12                                                           |
| Session          | httpOnly cookie; no sensitive data in localStorage                                 |
| Optimistic UI    | Status transitions in `/desk/[id]` use `useOptimistic`                             |
| Pagination       | Ticket lists paginated; no unbounded queries                                       |

---

## Testing

### Unit / Integration (Vitest)

| Test case                                        | Assertion                        |
| ------------------------------------------------ | -------------------------------- |
| Requester reads another requester's ticket       | Returns 403 / throws             |
| `isInternal: true` comment returned to requester | Fails — comment must be stripped |
| Support transitions ticket to `ESCALATED`        | Throws — MANAGER+ required       |
| Service call without `teamId` match              | Throws                           |
| Super creates team                               | Succeeds; team row created       |
| Invalid FSM transition                           | `assertTransition` throws        |
| Valid FSM transition                             | Writes `StatusEvent` row         |

### E2E (Playwright)

| Flow                                                    | Verified                |
| ------------------------------------------------------- | ----------------------- |
| Field agent: login → create ticket → view in My tickets | Requester path          |
| Support: login → assign → internal note → status change | Support path            |
| Manager: escalate → close → reopen                      | Permission gates        |
| Team B support: attempt to access Team A ticket         | Returns 403 / redirects |

---

## CI/CD

### On every push / PR

```
eslint → tsc --noEmit → vitest → next build
```

### On merge to `main`

```
→ deploy to Railway production
```

Playwright E2E runs against Railway preview deployment on pull requests.

---

## Deployment

| Component  | Service                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| Web        | Railway (Next.js standalone container)                                                                     |
| Database   | Railway managed PostgreSQL service                                                                         |
| Migrations | `npx prisma migrate deploy` as Railway release command (runs before new deployment goes live)              |
| Secrets    | `DATABASE_URL` (Railway injects from Postgres service), `AUTH_SECRET`, `AUTH_URL` set in Railway dashboard |
| Config     | `railway.toml` at repo root — defines build, release, and start commands                                   |

---

## Seed Data

`prisma/seed.ts` creates:

- 1 Super user (`super@awano.local`)
- 2 teams with full demo user sets per team
- Sample tickets in each team across multiple statuses

| Email                | Role      | Type        |
| -------------------- | --------- | ----------- |
| `customer@demo.com`  | REQUESTER | CUSTOMER    |
| `recruiter@demo.com` | REQUESTER | RECRUITER   |
| `agent@demo.com`     | REQUESTER | FIELD_AGENT |
| `support@demo.com`   | SUPPORT   | —           |
| `manager@demo.com`   | MANAGER   | —           |

Login: `/login?team={slug}`. Demo password documented in `README.md`.

---

## Risks

| Risk                                                     | Mitigation                                              |
| -------------------------------------------------------- | ------------------------------------------------------- |
| Missing `teamId` filter leaks cross-tenant data          | Assertions + integration tests on every query path      |
| Session JWT not validated on sensitive actions           | `assertAuthenticated` called at the top of every action |
| Prisma client path (`src/generated/prisma`) not in scope | `tsconfig.json` path alias; enforced in CI build        |
| Auth.js v5 API diverges from v4 expectations             | Read `node_modules/next/dist/docs/` before implementing |

---

## Open Questions

### CI/CD & Infrastructure

| #   | Question                                                                                                                                                                                                                                                                                                                                                              | Owner | Due |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --- |
| 1   | **Railway PR environments:** Enable a Railway preview environment per PR, each with its own ephemeral Postgres instance? Enables Playwright E2E against real infra before merge. Cost: one Railway service + DB per open PR; complexity: seed must run on environment spin-up.                                                                                          | —     | —   |
| 2   | **GitHub Actions pipeline:** Run `eslint → tsc --noEmit → vitest → next build` in GH Actions rather than relying on Railway's build step alone? GH Actions gives PR status checks, job caching (`node_modules`, Next.js build cache), and matrix runs; Railway's build is simpler but doesn't block merges on test failure.                                          | —     | —   |
| 3   | **Separate NestJS API server:** Split into Next.js (UI + thin BFF) + NestJS (REST API) as two Railway services sharing the same Postgres? NestJS brings structured DI, guards, interceptors, and OpenAPI generation — valuable if the service layer grows complex or needs to be consumed by a mobile client. Trade-off: a service-to-service hop on every Server Action, two repos or a monorepo workspace to maintain, and Railway costs for a second web service. Not justified for v1; revisit if a mobile app or public API lands on the roadmap. | —     | —   |
| 4   | **Migration rollback strategy:** `prisma migrate deploy` runs as a Railway release command — a failed migration can leave the DB in a partial state before the new container goes live. Options: (a) additive-only migrations enforced by convention; (b) explicit down migrations checked in alongside each up; (c) separate Railway "migration job" service that must succeed before the web deploy proceeds. | —     | —   |
| 5   | **Health check & zero-downtime deploys:** Add a `/api/health` endpoint and configure Railway's health-check path so the old instance keeps serving traffic until the new one passes? Currently no health check is configured; a slow cold start could drop in-flight requests.                                                                                         | —     | —   |
| 6   | **Rate-limiting login:** Edge middleware (stateless, no extra infra) vs. Upstash Rate Limit (Redis-backed, survives multiple instances)? Stateless middleware is sufficient while Railway runs a single instance; add Upstash when horizontal scaling becomes relevant.                                                                                                | —     | —   |

### Feature

| #   | Question                                                                                                                                                                                                                                                                                                                                                              | Owner | Due |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --- |
| 7   | **Ocaps (Object Capabilities):** Issue revocable, unforgeable capability tokens for scoped external access — e.g. a guest link to view a single ticket without an account, or a per-integration API token scoped to one category. Complements RBAC rather than replacing it; could ship as a v2 add-on without touching the session model. See Non-goals.             | —     | —   |

---

## Decision Log

| Decision                                        | Rationale                                                                                                              |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Auth.js v5 Credentials over custom JWT          | Standard library; handles session rotation and CSRF                                                                    |
| Stateless JWT session (not DB sessions)         | No session table to maintain; sufficient for small company scale                                                       |
| Service layer between Server Actions and Prisma | Keeps business rules testable without mocking Next.js; prevents direct DB access from components                       |
| FSM in `src/lib/tickets/fsm.ts`                 | Single source of truth for valid transitions; eliminates scattered status-check conditionals                           |
| Railway over Vercel + Supabase                  | Single platform for app + Postgres; no cold starts on the web service; simpler ops for a persistent container workload |
| Prisma client output to `src/generated/prisma`  | Avoids `node_modules` pollution; required by Prisma 7 `generator client` config                                        |
| Ocaps deferred to post-v1                        | RBAC via session roles is sufficient for the closed-team model in v1. Ocaps adds meaningful implementation surface (token issuance, storage, revocation, expiry) only justified once external guest access or a public API is on the roadmap. |
