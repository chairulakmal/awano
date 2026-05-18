# Awano — Product Spec

| | |
|---|---|
| **Project name** | Awano |
| **Repository / folder** | `awano` |
| **Package name (npm)** | `awano` (or `@awano/web` if using a monorepo later) |

**Product:** **Awano** is a multi-team support desk for a workforce/recruitment-style company. **Customers**, **recruiters**, and **field agents** submit tickets; **support staff** triage and resolve them; **managers** authorize sensitive actions and oversee the queue. A **super admin** provisions **teams** so each job application can point to an isolated demo tenant with its own accounts.

**Stack:** Next.js (App Router) · TypeScript · Prisma · PostgreSQL · Deployed (e.g. Vercel + managed Postgres)

---

## Roles & permissions

| Role | Who | Permissions |
|------|-----|-------------|
| **Requester** (`CUSTOMER`, `RECRUITER`, `FIELD_AGENT`) | External/partner users | Create ticket, comment on own tickets, upload attachments, view own tickets only |
| **Support** (`SUPPORT`) | Company support staff | View **team** queue, assign self/others, change status/priority, public + **internal** notes, cannot manage users |
| **Manager** (`MANAGER`) | Team lead / ops | Everything Support has + **reassign any ticket**, **close/reopen**, manage users & categories within team, view dashboard & export |
| **Admin** (`ADMIN`) | Team IT/ops (optional; can merge with Manager per team) | User invites, role changes, category CRUD within team |
| **Super** (`SUPER`) | Platform operator (you, for demos) | Create/update **teams**, seed or manage demo users across teams, view all teams (read-only on tickets optional in v1), no day-to-day ticket handling required |

### Authorization rules

- All tickets, users, and categories are scoped by `teamId` (except Super acting on team metadata).
- Requesters never see `isInternal: true` comments or other users’ tickets.
- Only **Manager+** (within a team) can change another user’s role or deactivate users.
- Only **Super** can create teams and assign the first Manager/Admin for a team.
- **Support** cannot reassign tickets to arbitrary users unless **Manager+** (configurable: MVP = Manager-only for assign-to-other).
- Status changes to `ESCALATED` or reopening `CLOSED` tickets: **Manager+** within the team.

---

## Teams (multi-tenant demo)

Each **team** is an isolated workspace (separate demo company). Use one **Awano** deployment; many teams for tailoring resumes per job application.

| Concept | Description |
|---------|-------------|
| **Team** | Top-level tenant: name, slug (e.g. `tokuty-demo`), optional notes for your own reference (`"Resume — Tokuty 2026-05"`) |
| **Membership** | Users belong to exactly one team (MVP). Email unique **per team** (`support@demo.com` can exist in Team A and Team B) |
| **Super workflow** | Super creates team → creates or seeds users → shares login sheet in README / resume |
| **Login** | User enters email + password; login form includes **team slug** (e.g. `/login?team=tokuty-demo`) |

### Super: team management (MVP screens)

| Route | Purpose |
|-------|---------|
| `/super/teams` | List teams, create team (name, slug) |
| `/super/teams/[teamId]` | Team detail: member list, quick “seed demo users” action, copy-paste credential block |
| `/super/teams/[teamId]/users/new` | Create user in team (email, password, role, requester type) |

### Seed demo users (per team)

One-click or script seeds the standard set:

| Email pattern | Role | Requester type |
|---------------|------|----------------|
| `customer@demo.com` | Requester | `CUSTOMER` |
| `recruiter@demo.com` | Requester | `RECRUITER` |
| `agent@demo.com` | Requester | `FIELD_AGENT` |
| `support@demo.com` | Support | — |
| `manager@demo.com` | Manager | — |

Password: single documented demo password (e.g. `Demo123!`) in README; override per team in Super UI optional.

**Resume usage:** List only the team slug + accounts for that application, e.g. “**Awano** demo — team `tokuty-demo` — `support@demo.com` / `manager@demo.com`”.

---

## Ticket workflow

```
OPEN → IN_PROGRESS → WAITING_ON_REQUESTER → RESOLVED → CLOSED
         ↓                    ↑
      ESCALATED (Manager visibility emphasized)
```

| Status | Meaning |
|--------|---------|
| `OPEN` | New, unassigned or just created |
| `IN_PROGRESS` | Support working |
| `WAITING_ON_REQUESTER` | Blocked on customer/recruiter/agent reply |
| `ESCALATED` | Needs manager attention |
| `RESOLVED` | Fix delivered, awaiting confirmation |
| `CLOSED` | Done |

**Priority:** `LOW` | `NORMAL` | `HIGH` | `URGENT` (Support+ sets; Requester default `NORMAL`)

**Categories (per team, seed on team create):** Account · Billing · Technical · Recruitment · Field ops · Other

---

## Data model (Prisma-level)

```
Team (id, name, slug unique, notes?, createdAt)
User (teamId, email, passwordHash, role, requesterType?, name?)
Category (teamId, name, slug)
Ticket (teamId, createdById, assigneeId?, categoryId, subject, body, status, priority)
Comment (ticketId, authorId, body, isInternal)
StatusEvent (ticketId, actorId, fromStatus?, toStatus, note?)
Attachment (ticketId, commentId?, fileName, url, uploadedById)  // v1.1 optional
```

**Constraints**

- `@@unique([teamId, email])` on `User`
- `@@unique([slug])` on `Team` (global slug for login URL: `/login?team=tokuty-demo`)

**Indexes**

- `Ticket`: `(teamId, status)`, `(teamId, assigneeId)`, `(createdById)`
- `Comment` / `StatusEvent`: `(ticketId, createdAt)`

---

## Core screens

| Route | Audience | Purpose |
|-------|----------|---------|
| `/login` | All | Team slug + email + password |
| `/tickets` | Requester | My tickets |
| `/tickets/new` | Requester | Create ticket |
| `/tickets/[id]` | Requester | Thread (public only), status read-only |
| `/desk` | Support, Manager | Inbox: Unassigned · Mine · Open · Escalated |
| `/desk/[id]` | Support, Manager | Assign, status, priority, replies, internal notes, timeline |
| `/admin/users` | Manager, Admin | Users in **this team** |
| `/admin/categories` | Manager, Admin | Categories in **this team** |
| `/admin/dashboard` | Manager, Admin | Stats for **this team** |
| `/super/teams` | Super | List / create teams |
| `/super/teams/[id]` | Super | Members, seed demo, export credentials |

---

## API / server actions (representative)

| Action | Auth |
|--------|------|
| Auth register/login | Public (login scoped by team) |
| `GET/POST tickets` | Requester+ (own only for Requester) |
| `GET desk/tickets` | Support+ (`teamId` from session) |
| `PATCH ticket` | Support+ (reassign anyone: Manager+) |
| `POST comment` | Requester (own, non-internal); Support+ |
| Team users, categories | Manager+ |
| `POST/GET/PATCH teams`, seed users | **Super only** |

**Validation:** Zod on input; never accept `teamId` or `createdById` from client on create; derive from session.

---

## Key user stories (MVP)

1. **Super** creates team `tokuty-demo`, seeds demo users, copies credentials for resume.
2. **Requester** (field agent) submits ticket; sees it under My tickets.
3. **Support** assigns ticket, adds internal note (hidden from requester).
4. **Support** public reply → `WAITING_ON_REQUESTER`; requester replies.
5. **Manager** escalates, closes, reopens; views team dashboard.
6. **Super** creates second team `meetsmore-demo` with same email patterns — isolated data.
7. **Audit:** Ticket detail shows **StatusEvent** timeline.

---

## Auth & security

- Session: **NextAuth (Credentials)** or httpOnly JWT; bcrypt passwords.
- Session payload: `userId`, `teamId`, `role`, `requesterType?`.
- Middleware: `/desk/*` → Support+; `/admin/*` → Manager+; `/super/*` → Super only.
- Helpers: `assertCanViewTicket(user, ticket)`, `assertCanUpdateTicket(user, ticket)`, `assertSameTeam(user, resource)`.
- Super cannot impersonate without explicit “act as” (out of scope v1).

---

## Non-goals (v1)

- Email/Slack notifications (stub only)
- Self-service team signup (only Super creates teams)
- SLA timers, CSAT, full-text search
- Mobile app
- Cross-team ticket transfer

---

## Quality bar (portfolio)

- [ ] Migrations + seed (1 Super user, 2 teams with demo users, sample tickets per team)
- [ ] Deployed URL + README with per-team credential tables
- [ ] Tests: requester isolation; internal note hidden; cross-team access denied; Super can create team
- [ ] CI: lint + test on push
- [ ] `ARCHITECTURE.md`: roles, team scoping, auth flow

---

## Demo accounts (template per team)

After seeding team `{slug}`:

| Email | Role | Type |
|-------|------|------|
| `customer@demo.com` | Requester | CUSTOMER |
| `recruiter@demo.com` | Requester | RECRUITER |
| `agent@demo.com` | Requester | FIELD_AGENT |
| `support@demo.com` | Support | — |
| `manager@demo.com` | Manager | — |

**Login:** `https://{awano-app}/login?team={slug}` · Password: see README (e.g. `Demo123!`)

**Super (global, not per team):** `super@awano.local` — store hash in env; not committed.

---

## Resume snippet (example)

```text
Awano — multi-team support desk (Next.js, Prisma, PostgreSQL)
URL: https://...
Team: tokuty-demo
Accounts: support@demo.com (Support), manager@demo.com (Manager)
Login: /login?team=tokuty-demo · Password: Demo123!
```

---

## Success criteria

A reviewer can: log in as Super → create team → seed users → log in as field agent in that team → create ticket → log in as support in **same team** → resolve — and confirm **another team’s** support cannot see the ticket. Completed on the live **Awano** URL in under 10 minutes.
