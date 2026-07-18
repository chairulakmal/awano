# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository: the invariants and trip-wires most worth knowing, each pointing at the doc that owns the full rule. `docs/SPEC.md` owns the architecture: roles, permissions, data model, auth, route map, testing, deployment, and the decision log. `README.md` owns the public description, commands, and local setup. If this file disagrees with either, one of them is a bug: fix that one.

@AGENTS.md

## Working here

- Commands, local setup (Docker Postgres, `.env`, migrations, seed), and test invocations: `README.md` § Running locally and § Tests.
- The Prisma client is generated to `src/generated/prisma`: import from there, never from `@prisma/client`. `docs/SPEC.md` § Data Model.
- Tailwind is v4 via the PostCSS plugin, not the v3 CLI.

## Invariants

One line each; the full rules and their reasoning live in `docs/SPEC.md` at the named section.

- Awano is a multi-tenant support desk: every piece of data is scoped to a `Team`, cross-team access is a security boundary, and every query on a tenant-scoped model includes `teamId` in the `where` clause. *(§ Permission rules)*
- `teamId`, `userId`, and `role` come from the session on every mutation, never from the client; all input is validated with Zod at the server boundary. *(§ Permission rules, § Non-functional Requirements)*
- Roles, assignment ceilings, the requester promotion path, and who may escalate or reopen: *(§ Roles & Permissions)*. The session payload shape: *(§ Auth & Session)*.
- Route guards live in `src/proxy.ts`, never `middleware.ts`: Next.js 16 renamed it, and a `middleware.ts` file is silently ignored. The path-to-role table: *(§ Auth & Session)*.
- Ticket status changes go through the FSM in `src/lib/tickets/fsm.ts` and atomically write a `StatusEvent`. *(§ Ticket State Machine)*
- Data model, constraints, indexes, and cascade behaviour: *(§ Data Model)*.
- Server Actions that accept file uploads need `serverActions.bodySizeLimit` raised in `next.config`; the 1 MB default silently rejects larger multipart bodies before the action runs. *(§ Non-functional Requirements)*
- Do not add `'use cache'` to server actions or service functions; it requires `cacheComponents: true`, which this project does not set. *(§ Caching (`use cache`))*
