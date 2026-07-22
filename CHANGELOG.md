# Changelog

The record of what has shipped in Awano, newest first. Everything here is implemented and deployed; planned work lives in [TODO.md](TODO.md), and the engineering rationale in [docs/SPEC.md](docs/SPEC.md). Below, one entry per release, each grouped into Added, Security, Tested, and Infrastructure.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-05-21

The initial release: a multi-tenant support desk on Next.js 16 Server Actions with no separate API layer, where every mutation derives `teamId`, `userId`, and `role` from the server-side session and one service layer enforces the tenant boundary on every query.

### Added

- **Multi-tenant auth.** Auth.js v5 Credentials provider, bcrypt-hashed passwords, stateless JWT in an `httpOnly` cookie, team-slug login. The platform super admin belongs to no team and signs in without a slug.
- **Role-based access control.** Five roles (Requester, Support, Manager, Admin, Super) with route guards in `src/proxy.ts` and every tenant-scoped query filtered by the session's `teamId`.
- **Ticket workflow.** A finite state machine with nine valid transitions, each gated by a minimum role, writing the ticket update and a `StatusEvent` audit row atomically inside one Prisma `$transaction`.
- **Support desk.** Inbox views (Unassigned, Mine, Open, Escalated), assignment, priority, internal notes, and optimistic status transitions via `useOptimistic` that revert on server rejection.
- **Requester portal.** My-tickets list, create-ticket form, and a thread view with public replies; internal notes are filtered out of the query itself for requesters.
- **Admin console.** User and role management, category CRUD, and a dashboard of status breakdown, average first-response time, and top assignees, all scoped to the team.
- **Super admin.** Team provisioning, per-team user creation, and a one-click demo-seed button.
- **File attachments.** `bytea` storage with a 1 MB cap, browser-side Canvas compression to WebP (JPEG fallback on Safari), and an authenticated serve route.
- **Ticket search.** Case-insensitive `ILIKE` on subject and body, debounced from the desk sidebar, always scoped to `teamId`.
- **Cursor pagination.** All ticket lists fetch `limit + 1` rows and use the extra row as the "more pages" signal, avoiding offset drift under concurrent writes.
- **Profile and password change.** A `/profile` page with a password-change modal that verifies the current password with bcrypt before saving.

### Security

- bcrypt cost factor 12 on all password hashing.
- Login and password-change rate limiting: sliding-window counter, 5 attempts per 15 minutes, keyed on email and user id respectively, rejecting before bcrypt runs.
- Session eviction after a password change: the stateless JWT is invalidated by signing the user out.
- Server-side MIME allowlist and size cap on uploads, defending against stored XSS via `Content-Type` spoofing on the serve route.
- Server-side Zod validation at every action boundary; `teamId`, `userId`, and `role` never come from the client.
- HSTS (2 year), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a `Referrer-Policy` on every response.
- Consolidated authentication error messages so distinct failure states do not leak through the response.

### Tested

- 230 Vitest unit tests across the FSM, every authorization assertion path, and every service function, with Prisma mocked so the suite needs no database.
- 7 Playwright E2E specs covering requester, support, manager, cross-team isolation, login rate limiting, and desk search.

### Infrastructure

- CI on every push and pull request to `main`: ESLint, `tsc --noEmit`, the unit suite, and a production build.
- Railway deployment: Railpack builder, `output: "standalone"`, managed PostgreSQL, and pre-deploy migrations. `trustHost: true` resolves the reverse-proxy origin so login redirects work behind Railway's TLS-terminating load balancer.
- `main` governed by a GitHub ruleset requiring a passing CI check and blocking direct and force pushes.
