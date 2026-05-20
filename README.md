# Awano

A full-stack, multi-tenant support desk built to demonstrate production-grade Next.js engineering — role-based access control, a finite state machine for ticket workflows, tenant isolation enforced at every database query, and an audit trail on every status change.

> Try it: [`/login?team=demo`](http://localhost:3000/login?team=demo) — credentials below.

---

## What it does

External requesters (customers, recruiters, field agents) submit support tickets. Support agents manage the queue, reply, and leave internal notes. Managers handle escalations, close tickets, and track team metrics. A platform super admin provisions isolated workspaces for each organisation.

Every piece of data is scoped to a **Team**. A support agent from Team A cannot read, write, or even accidentally stumble on Team B's tickets — this is enforced in every service function, not just in the UI.

---

## Interesting engineering decisions

**Finite state machine for ticket status.** Valid transitions (`OPEN → IN_PROGRESS`, `IN_PROGRESS → ESCALATED`, etc.) live in a single table in `src/lib/tickets/fsm.ts`, each with a minimum required role. Every status change goes through `assertTransition()`, which throws if the pair is invalid or the actor's role is too low. On success, a `StatusEvent` row is written for a full, immutable audit trail.

**Authorization as typed assertions.** Business rules aren't scattered across route handlers — they're explicit typed functions (`assertAuthenticated`, `assertRole`, `assertSameTeam`, `assertCanViewTicket`) called at the top of every server action before any database work begins. A missing assertion is a visible gap, not a silent omission.

**`teamId` never comes from the client.** On every mutation, `teamId`, `userId`, and `role` are derived from the server-side session. The Zod schema at each server action only accepts what the client legitimately controls. This prevents privilege escalation regardless of what a client sends.

**Service layer keeps business logic testable.** The pattern is `Server Action → service.ts → Prisma`. No Prisma calls outside the service layer. This means the business rules (who can escalate, which transitions are valid) can be tested in Vitest against a real database without mocking Next.js internals.

**User-facing strings live in components, not logic.** Labels, error messages, and status copy are kept in UI components rather than server actions or service functions. The convention costs nothing now and keeps the codebase extractable for i18n without touching business logic when the time comes.

---

## Stack

| Layer      | Choice                                                            | Why                                                          |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| Framework  | Next.js 16 — App Router, Server Components, Server Actions        | Colocate mutations with UI; no separate API layer needed     |
| Language   | TypeScript `strict: true`                                         | Compiler catches missing `teamId` filters before runtime     |
| ORM        | Prisma 7 → PostgreSQL                                             | Typed query results; compound indexes on `(teamId, status)`  |
| Auth       | Auth.js v5 — Credentials, stateless JWT, `httpOnly` cookie        | No session table; CSRF handled; cookie inaccessible to JS    |
| Validation | Zod on every server boundary                                      | Validated types flow through the rest of the function        |
| Testing    | Vitest (unit/integration) · Playwright (E2E)                      | Vitest hits a real DB; Playwright tests full user journeys   |
| Deployment | Railway — persistent container + managed PostgreSQL               | No cold starts; app and DB on one platform                   |

---

## Roles & access

| Role          | Access                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------- |
| **Requester** | Submit tickets, comment and track their own tickets only — never sees internal notes     |
| **Support**   | Team inbox, assign, status transitions, internal notes                                   |
| **Manager**   | Everything Support can do + escalate, close/reopen, manage users and categories          |
| **Admin**     | User invites, role changes, category CRUD within a team                                  |
| **Super**     | Provision teams and users across the platform; is not part of any team           |

Route prefixes enforce this at the middleware layer: `/desk/*` requires Support+, `/admin/*` requires Manager+, `/super/*` requires Super.

---

## Running locally

**Prerequisites:** Node.js, Docker

```bash
npm install
cp .env.example .env
docker compose up -d          # Start PostgreSQL
npx prisma migrate dev        # Apply schema + generate client
npx prisma db seed            # Seed demo teams and users
npm run dev                   # http://localhost:3000
```

```bash
npm run build       # Production build
npm run lint        # ESLint
npm run format      # Prettier
npx prisma studio   # Database GUI
```

---

## Demo accounts

Log in at [`/login?team=demo`](http://localhost:3000/login?team=demo) — password for all accounts: **`demo1234`**

| Email                | Role      | Requester type |
| -------------------- | --------- | -------------- |
| `customer@demo.com`  | Requester | Customer       |
| `recruiter@demo.com` | Requester | Recruiter      |
| `agent@demo.com`     | Requester | Field Agent    |
| `support@demo.com`   | Support   | —              |
| `manager@demo.com`   | Manager   | —              |

Super admin: `super@awano.local` at `/login` (no team slug — Super users have no team).

---

## Spec & design decisions

Full engineering design doc, data model, FSM transition table, test plan, and decision log: [docs/SPEC.md](docs/SPEC.md).

---

## License

[MIT](./LICENSE)
