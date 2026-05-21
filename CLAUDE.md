# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this
repository.

@AGENTS.md

## Commands

```bash
# Development
npm run dev          # Next.js dev server on http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes in place)

# Database (requires Docker)
docker compose up -d             # Start PostgreSQL container
npx prisma migrate dev           # Apply migrations + regenerate client
npx prisma migrate dev --name X  # Create + apply a new named migration
npx prisma studio                # GUI for the database
```

```bash
# Testing
npm test              # Vitest unit tests (all mocked — no DB required)
npm run test:watch    # Re-run on change
npx playwright test   # E2E (requires dev server running)
```

## Database setup

PostgreSQL runs in Docker (`docker-compose.yml`). Credentials: user `awano`, password `awano`, db
`awano`, port `5432`.

Copy `.env.example` to `.env` before running migrations. The Prisma client is generated to
`src/generated/prisma` (not the default location) — import from there, not from `@prisma/client`.

## Architecture

**Awano** is a multi-tenant support desk. Every piece of data (tickets, users, categories) is scoped
to a `Team`, which is the top-level tenant. Cross-team data access must be treated as a security
boundary.

### Stack

- **Next.js 16.2.6** — App Router only. APIs and conventions may differ from training data; read
  `node_modules/next/dist/docs/` before writing Next.js-specific code.
- **Prisma 7** with PostgreSQL
- **Tailwind CSS v4** (PostCSS plugin, not the v3 CLI)
- **TypeScript** throughout

### Roles

Five roles exist on `User.role` (`Role` enum): `REQUESTER`, `SUPPORT`, `MANAGER`, `ADMIN`, `SUPER`.

- `REQUESTER` has a `requesterType` (`CUSTOMER`, `RECRUITER`, `FIELD_AGENT`).
- `SUPER` users have `teamId = null`; all others belong to exactly one team.
- Authorization escalates: MANAGER > SUPPORT > REQUESTER; SUPER is platform-wide.

### Authorization rules (enforce in every server action / route handler)

- Derive `teamId`, `userId`, and `role` from the session — never accept them from the client on
  mutations.
- All DB queries on tenant-scoped models must include `teamId` in the `where` clause.
- Requesters see only their own tickets and only non-internal (`isInternal: false`) comments.
- `ESCALATED` status and reopening `CLOSED` tickets: Manager+ only.
- Use helpers `assertCanViewTicket`, `assertCanUpdateTicket`, `assertSameTeam` (to be written in
  `src/lib/auth/`).

### Session

Auth.js v5 Credentials provider. Session payload: `userId`, `teamId`, `role`, `requesterType?`.

### Route guards (Next.js 16 proxy pattern)

Next.js 16 renamed `middleware.ts` → `proxy.ts`. Do **not** create `middleware.ts` — it is ignored.

- The exported function must be named `proxy` (not `middleware`).
- Use the `NextProxy` type for the function signature, or import `NextRequest` / `NextResponse` from
  `next/server` as before.
- A `config.matcher` array still controls which paths the proxy runs on.
- Proxy runs in the **Node.js runtime** by default (not Edge) in v16.

Route guards in `src/proxy.ts`:

- `/desk/*` → Support+
- `/admin/*` → Manager+
- `/super/*` → Super only

### Server Actions — body size limit

Server Actions default to a **1 MB** request body limit. File upload actions must increase this via
`next.config`:

```ts
// next.config.ts
serverActions: {
  bodySizeLimit: '3mb', // raise when accepting 2 MB pre-compression images
}
```

Without this, multipart uploads over 1 MB are silently rejected before the action runs.

### Caching (`use cache` directive)

Next.js 16 introduces a `'use cache'` directive (requires `cacheComponents: true` in `next.config`).
It is **not** the same as `React.cache` or `unstable_cache`. Avoid adding it to server actions or
service functions — caching belongs at the component or data-fetch layer, not the mutation layer.

### Planned route structure

| Prefix       | Audience         |
| ------------ | ---------------- |
| `/login`     | All              |
| `/tickets/*` | Requester        |
| `/desk/*`    | Support, Manager |
| `/admin/*`   | Manager, Admin   |
| `/super/*`   | Super            |

### Data model summary

`Team → User, Category, Ticket` (all cascade-delete on team removal).  
`Ticket → Comment, StatusEvent` (audit trail of status changes).  
`@@unique([teamId, email])` on `User` — same email can exist in multiple teams.

### Validation

Use **Zod** for all input at server boundaries. Never trust `teamId`, `createdById`, or `role` from
the request body.
