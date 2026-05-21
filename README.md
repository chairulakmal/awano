# Awano

Multi-tenant support desk demonstrating production-grade Next.js engineering: role-based access
control, a finite-state ticket workflow, cross-tenant isolation enforced at every database query,
and an immutable audit trail on every status change.

[![CI](https://github.com/chairulakmal/awano/actions/workflows/ci.yml/badge.svg)](https://github.com/chairulakmal/awano/actions/workflows/ci.yml)
&nbsp;
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
&nbsp; ![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white) &nbsp;
![Tests](https://img.shields.io/badge/unit_tests-169_passing-22c55e)

---

## Live demo

[`awano.chairulakmal.com/login?team=demo`](https://awano.chairulakmal.com/login?team=demo)

Log in as `support@awano.demo` / `oretachinomachida` to see the agent desk, or use any account from
the [demo accounts table](#demo-accounts) below to explore a different role.

---

## Stack

| Layer      | Choice                                                     | Why                                                                                                     |
| ---------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Framework  | Next.js 16 — App Router, Server Components, Server Actions | Colocate mutations with UI; no separate API layer needed                                                |
| Language   | TypeScript `strict: true`                                  | Compiler catches missing `teamId` filters before runtime                                                |
| ORM        | Prisma 7 → PostgreSQL                                      | Typed query results; compound indexes on `(teamId, status)`                                             |
| Auth       | Auth.js v5 — Credentials, stateless JWT, `httpOnly` cookie | No session table; CSRF handled; cookie inaccessible to JS                                               |
| Validation | Zod on every server boundary                               | Validated types flow through the rest of the function                                                   |
| Testing    | Vitest (unit) · Playwright (E2E)                           | Vitest mocks Prisma — tests focus on business logic; Playwright runs full user journeys against Railway |
| Deployment | Railway — persistent container + managed PostgreSQL        | No cold starts; app and DB on one platform                                                              |

---

## Engineering highlights

**Finite state machine for ticket status.** All valid transitions (`OPEN → IN_PROGRESS`,
`IN_PROGRESS → ESCALATED`, etc.) and their minimum required role live in one lookup table in
`src/lib/tickets/fsm.ts`. `assertTransition()` throws on invalid pairs or insufficient role; on
success a `StatusEvent` row is appended for an immutable audit trail.

**Atomicity on the audit trail.** Each status transition writes two records — the updated ticket and
a new `StatusEvent` — inside a single Prisma `$transaction`. If either write fails both roll back,
so a ticket can never appear to jump states with no recorded cause.

**Authorization as typed assertions.** Business rules live in explicit typed functions
(`assertAuthenticated`, `assertRole`, `assertSameTeam`, `assertCanViewTicket`) called at the top of
every server action before any DB work begins. A missing assertion is a visible gap in the code, not
a silent omission.

**`teamId` never comes from the client.** On every mutation, `teamId`, `userId`, and `role` are
derived from the server-side session — the Zod schema at each server action accepts only what the
client legitimately controls. This prevents privilege escalation regardless of what a client sends.

**Service layer keeps business logic testable.** The pattern is
`Server Action → service.ts → Prisma` with no Prisma calls outside the service layer. Business rules
are unit-tested in Vitest with a mocked DB client — no database or Next.js infrastructure needed.

**Diagnosing a reverse-proxy auth bug in production.** After deploying to Railway, every successful
login redirected back to the login form. Railway terminates TLS at its load balancer, so without
`trustHost: true` Auth.js couldn't resolve the real HTTPS origin from forwarded headers and fell
back to the sign-in page after every login. One-line fix; finding the root cause required
understanding how Auth.js validates redirect URLs behind a reverse proxy.

**Optimistic UI for status transitions.** Clicking a status button applies the change immediately
via React's `useOptimistic` before the server action resolves. If the action fails — for example
because the agent's role has changed since page load — the UI reverts automatically. The server
remains the source of truth.

**Password policy informed by NIST, not convention.** The password change form enforces a
15-character minimum and nothing else. NIST SP 800-63B states length is a stronger entropy predictor
than character-set diversity, and that complexity rules push users toward predictable substitutions
like `Password1!`.

**Revoking a stateless JWT without a session table.** After a password change the old JWT is still
technically valid. Rather than adding a `passwordChangedAt` column and checking it on every request,
the client calls `signOut({ callbackUrl: "/login" })` from `next-auth/react` after the success flash
— clearing the `httpOnly` cookie with no schema migration needed.

**Cursor-based pagination with client-side "Load more".** Ticket lists fetch `limit + 1` rows; if
the extra row exists there are more pages and `nextCursor` is set to the last returned id. The desk
page is a Server Component that renders the first page; a `DeskTicketList` client component appends
subsequent pages to local state via a `loadMoreDeskTickets` server action. Offset-based `skip` is
avoided because it produces incorrect results when rows are inserted or deleted between pages.

**Client/server component boundary in the header.** The `Header` component calls `auth()` and
renders entirely on the server with no client JS. Interactive parts (dropdown state, keyboard and
pointer handlers) are isolated in a `UserMenu` client component that receives only `name`, `email`,
and `role` as props — keeping the server component tree as large as the UX permits.

---

## What it does

External requesters (customers, recruiters, field agents) submit support tickets. Support agents
manage the queue, reply, and leave internal notes. Managers handle escalations, closures, and team
metrics. A platform super admin provisions isolated workspaces for each organisation.

Every piece of data is scoped to a **Team**. A support agent from Team A cannot read, write, or
accidentally stumble on Team B's tickets — this is enforced in every service function, not just in
the UI.

---

## Roles & access

| Role          | Access                                                                               |
| ------------- | ------------------------------------------------------------------------------------ |
| **Requester** | Submit tickets, comment and track their own tickets only — never sees internal notes |
| **Support**   | Team inbox, assign, status transitions, internal notes                               |
| **Manager**   | Everything Support can do + escalate, close/reopen, manage users and categories      |
| **Admin**     | User invites, role changes, category CRUD within a team                              |
| **Super**     | Provision teams and users across the platform; is not part of any team               |

Route guards are enforced in `src/proxy.ts` (Next.js 16's replacement for `middleware.ts`):
`/desk/*` requires Support+, `/admin/*` requires Manager+, `/super/*` requires Super only,
`/profile` requires any authenticated role.

---

## Security

The multi-tenant boundary is enforced in the service layer, not the UI.

| Property                                | Implementation                                                                                                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cross-tenant isolation**              | Every tenant-scoped query includes `teamId` in the `WHERE` clause. `assertSameTeam()` is called on any fetch-by-ID path as a second check.                              |
| **Session is the authority**            | On every mutation, `teamId`, `userId`, and `role` come from the server-side JWT — never from `FormData` or the request body.                                            |
| **Input validation**                    | Zod schemas at every server action boundary. Enums are validated with `z.nativeEnum()` so invalid status/priority values are rejected before reaching the DB.           |
| **Internal comments**                   | The service layer strips `isInternal: true` comments from any response to a `REQUESTER` session — the UI cannot opt out of this.                                        |
| **Route guards**                        | `src/proxy.ts` enforces role minimums at the edge: `/desk/*` → Support+, `/admin/*` → Manager+, `/super/*` → Super only.                                                |
| **Session eviction on password change** | `signOut({ callbackUrl: "/login" })` called client-side after a successful password change — clears the `httpOnly` cookie immediately.                                  |
| **Login rate limiting**                 | In-process sliding-window counter: 5 attempts per 15-minute window keyed on email address. Blocks before `signIn()` is called — bcrypt never runs on a blocked request. |
| **Password change rate limiting**       | Same pattern, keyed on `userId`. Blocks before bcrypt work begins. Reset on success.                                                                                    |
| **Security headers**                    | `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` applied to all responses via `next.config.ts`.               |
| **Attachment MIME allowlist**           | `addAttachment` rejects any MIME type not in `{ image/jpeg, image/png, image/webp, application/pdf }` before the DB write — prevents XSS via `Content-Type` spoofing on the `/api/attachments/[id]` serve route. |

A self-audit found one defence-in-depth gap: the top-assignees query in `getDashboardMetrics`
fetched users by ID without an explicit `teamId` filter (safe in practice because the IDs came from
a team-scoped query, but an implicit dependency). The filter was added to make isolation
unconditional.

---

## Tests

Service tests mock `@/lib/db` with `vi.mock` so no database connection is needed — the full suite
runs in CI without a Postgres service container. Playwright E2E covers complete user journeys
against the live Railway deployment.

Coverage: FSM transitions, all authorization assertion paths, and every service function (tickets,
users, categories, admin metrics).

```bash
npm test                # 169 unit tests
npm run test:watch      # Re-run on file change
npm run test:coverage   # V8 coverage report
npx playwright test     # E2E (requires dev server or Railway URL)
```

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

Log in at [`/login?team=demo`](https://awano.chairulakmal.com/login?team=demo) — password for all
accounts: **`oretachinomachida`**

| Email                  | Role      | Requester type |
| ---------------------- | --------- | -------------- |
| `customer@awano.demo`  | Requester | Customer       |
| `recruiter@awano.demo` | Requester | Recruiter      |
| `agent@awano.demo`     | Requester | Field Agent    |
| `support@awano.demo`   | Support   | —              |
| `manager@awano.demo`   | Manager   | —              |

Super admin: `super@awano.demo` at [`/login`](https://awano.chairulakmal.com/login) (no team slug —
Super users have no team).

---

## Design doc

Full engineering design doc, data model, FSM transition table, test plan, and decision log:
[docs/SPEC.md](docs/SPEC.md).

---

## Production deployment

Live at [`awano.chairulakmal.com`](https://awano.chairulakmal.com).

| Concern           | Approach                                                                                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Build**         | Next.js `output: "standalone"` — only the production closure is shipped; dev dependencies stay out of the container image                                         |
| **Static assets** | Copied from `.next/static` into `.next/standalone/.next/static` at build time so the standalone server can serve them directly                                    |
| **Database**      | Railway managed PostgreSQL; `DATABASE_URL` injected automatically via a Railway service reference variable                                                        |
| **Migrations**    | `npx prisma migrate deploy` runs as a `preDeployCommand` — the old container keeps serving until migrations succeed and the new container passes the health check |
| **Networking**    | `HOSTNAME=0.0.0.0` set in the start command so the Node server binds to all interfaces, not just localhost                                                        |
| **Config**        | `railway.json` at repo root — Railpack builder, replica count, restart policy, and region pinned to `asia-southeast1`                                             |

---

## License

[MIT](./LICENSE)
