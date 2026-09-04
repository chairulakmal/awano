# Awano

[![CI](https://github.com/chairulakmal/awano/actions/workflows/ci.yml/badge.svg)](https://github.com/chairulakmal/awano/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Awano is a multi-tenant support desk built on Next.js 16 Server Actions with no separate API layer. Its guiding principle is trust you can verify: every mutation derives `teamId`, `userId`, and `role` from the server-side session, never from the client; one service layer enforces the tenant boundary on every query; and every status change leaves an audit record that cannot be edited after the fact. Below: the live demo, the highlights, the stack, how to run it locally, and how it is tested; [ARCHITECTURE.md](ARCHITECTURE.md) walks the design decisions.

**Live demo:** [awano.chairulakmal.com/login?team=demo](https://awano.chairulakmal.com/login?team=demo). One-click login buttons cover the everyday roles: three requester flavours (customer, recruiter, field agent), support, and manager. The team admin and the platform super admin sign in with credentials instead; the super admin, who provisions teams and belongs to none, signs in at [/login](https://awano.chairulakmal.com/login) with no team slug. The full permission matrix lives in [docs/SPEC.md](docs/SPEC.md).

## Highlights

- Ticket status is a finite state machine with a role gate on every edge. [`src/lib/tickets/fsm.ts`](src/lib/tickets/fsm.ts) is a single `TRANSITIONS` table of `{from, to, minRole}` rows, so escalating or reopening a closed ticket requires Manager while routine moves need only Support, and the whole rule set reads in one screen. Each transition writes the ticket update and a `StatusEvent` audit row inside one Prisma `$transaction` ([`src/lib/tickets/service.ts`](src/lib/tickets/service.ts)), so a ticket can never change state without a recorded cause.
- The tenant boundary is enforced in the service layer, not the UI. Every query on a tenant-scoped model filters by the session's `teamId`, and every fetch-by-id path re-checks ownership through the typed assertions in [`src/lib/auth/assertions.ts`](src/lib/auth/assertions.ts) (`assertAuthenticated`, `assertRole`, `assertSameTeam`, `assertCanViewTicket`, `assertCanUpdateTicket`). A missing assertion is a visible gap at the top of a function, not a silent omission.
- Requesters never receive internal notes, by construction. [`src/lib/tickets/service.ts`](src/lib/tickets/service.ts) filters `isInternal: true` comments out of the query itself when the session role is `REQUESTER`, so no page or component can opt out of the rule.
- Attachments are compressed in the browser before upload: [`src/lib/attachments/compress.ts`](src/lib/attachments/compress.ts) redraws images through a canvas to WebP, probing first because Safari silently falls back to PNG on `canvas.toBlob('image/webp')`. The server trusts none of it: [`src/lib/attachments/service.ts`](src/lib/attachments/service.ts) re-checks a MIME allowlist and a 1 MB cap, and the serve route ([`src/app/api/attachments/[id]/route.ts`](src/app/api/attachments/%5Bid%5D/route.ts)) runs the same view assertion as the ticket page.
- Ticket lists use cursor pagination with the `limit + 1` trick: fetch one extra row, and its presence is the "there are more pages" signal ([`src/lib/tickets/service.ts`](src/lib/tickets/service.ts)). A server component renders the first page and [`src/app/desk/DeskTicketList.tsx`](src/app/desk/DeskTicketList.tsx) appends later pages through a server action, so offset drift from concurrent inserts cannot skip or duplicate rows.
- Login rate limiting blocks before bcrypt runs: a sliding-window counter in [`src/app/login/actions.ts`](src/app/login/actions.ts) (5 attempts per 15 minutes, keyed on email) rejects a flooded request before any password hashing work begins, and [`src/app/profile/actions.ts`](src/app/profile/actions.ts) applies the same pattern to password changes, keyed on user id.
- Status buttons apply optimistically with `useOptimistic` ([`src/app/desk/[id]/StatusForm.tsx`](src/app/desk/%5Bid%5D/StatusForm.tsx)) and revert automatically when the server action rejects, for example because the agent's role changed since page load. The server-side FSM remains the only authority.
- One production bug worth reading about: after the first Railway deploy, every successful login bounced back to the login form, because Railway terminates TLS at its load balancer and Auth.js could not resolve the real HTTPS origin from forwarded headers. The fix is one line, `trustHost: true` in [`src/auth.config.ts`](src/auth.config.ts); finding it required understanding how Auth.js validates redirect URLs behind a reverse proxy.

## Stack

| Layer | What the code pins |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Server Components, Server Actions), React 19.2.4 |
| Language | TypeScript 5, `strict: true` |
| Data | Prisma 7.8 (`prisma-client` generator, `pg` driver adapter), PostgreSQL 16 |
| Auth | Auth.js v5 (next-auth 5.0.0-beta.31), Credentials provider, stateless JWT in an `httpOnly` cookie |
| Validation | Zod 4 at every server action boundary |
| Styling | Tailwind CSS 4 via the PostCSS plugin |
| Tests | Vitest 4 (unit, mocked Prisma), Playwright 1.60 (E2E) |
| Deployment | Railway: Railpack builder, standalone output, managed PostgreSQL ([railway.json](railway.json)) |

## Running locally

Prerequisites: Node 24 and a PostgreSQL 18 server. Docker is the easiest way to get one.

```bash
# 1. Dependencies (postinstall runs prisma generate)
npm install

# 2. Environment: the defaults match the database below
cp .env.example .env

# 3. PostgreSQL 18 on localhost:5432. Any instance works; this is a throwaway one.
docker run -d --name awano-db -p 5432:5432 \
  -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=awano postgres:18

# 4. Schema and demo data
npx prisma migrate dev
npx prisma db seed

# 5. Dev server on :3000
npm run dev
```

Open [localhost:3000/login?team=demo](http://localhost:3000/login?team=demo) and use the one-click buttons; [`prisma/seed.ts`](prisma/seed.ts) creates the demo team with one account per role. Deeper local-Postgres notes live in [docs/dev.md](docs/dev.md).

## Testing and CI

The unit suite is 234 Vitest tests across the FSM, every authorization assertion path, and every service function in every domain: tickets, users, categories, admin metrics, teams, and attachments. The tests mock `@/lib/db` with `vi.mock`, so the whole suite runs in seconds with no database and CI needs no Postgres service container. One regression the suite caught for real: a PR restricting assignee editing to managers silently removed support staff's ability to self-assign, and an `assignTicket` unit test surfaced the gap.

The Playwright suite ([`e2e/`](e2e)) is 149 tests over 13 files, ordered by risk: tenant isolation first, then the route guards for six roles against nine paths, internal-note visibility, the state machine, the role ceiling, and the login rate limit, followed by the feature journeys, accessibility scans and phone layouts. It runs in about a minute on four workers. Every run provisions its own two teams under a unique namespace and deletes them afterwards, so it is safe against a database shared with development and never depends on seed data. [`docs/TESTING.md`](docs/TESTING.md) explains the design, the coverage, the tags and the defects the suite currently records.

```bash
npm test                    # 234 unit tests, no database required
npm run test:coverage       # V8 coverage report
npm run test:e2e            # 149 Playwright tests; needs PostgreSQL, no seed data
npm run test:e2e:smoke      # the 10 @smoke tests, about 15 seconds
npm run db:seed:tickets     # optional: 60 bulk tickets for pagination testing
```

CI is one workflow, [`ci.yml`](.github/workflows/ci.yml): ESLint, `tsc --noEmit`, the unit suite and a production build, then the Playwright suite against that build on a PostgreSQL service container, split across two shards whose reports are merged into one.

## Architecture

[ARCHITECTURE.md](ARCHITECTURE.md) walks through the decisions with file paths: no separate API layer, tenant isolation as a service-layer discipline, the role-gated state machine and its atomic audit trail, stateless JWT sessions with no session table, attachments stored in Postgres with browser-side compression, a test suite that mocks Prisma so CI needs no database, and shipping as one standalone container on Railway. Each section states the choice, the reasoning, and the trade-off accepted. [docs/SPEC.md](docs/SPEC.md) is the full engineering design doc: data model, permission matrix, route map, test plan, and decision log.

## License

[MIT](LICENSE)
