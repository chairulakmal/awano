# Awano — Pre-Playwright Code Review

**Date:** 2026-05-20  
**Scope:** All source under `src/`, Prisma schema, vitest config.  
**Purpose:** Identify improvements and industry-standard gaps before writing E2E tests and calling
v1 done.

---

## Resolved

Changes applied with original findings kept in full for reference.

### R1 — Server actions cast FormData without validation

**Found:** Several actions bypassed Zod and cast directly with `as`, meaning any string from the
client passed through unchecked:

| File                      | Cast                                 | Problem                                                       |
| ------------------------- | ------------------------------------ | ------------------------------------------------------------- |
| `admin/users/actions.ts`  | `formData.get("userId") as string`   | No cuid validation                                            |
| `admin/users/actions.ts`  | `formData.get("role") as Role`       | No enum validation — `"SUPER"` or any garbage string accepted |
| `tickets/[id]/actions.ts` | `formData.get("ticketId") as string` | No cuid validation                                            |
| `tickets/[id]/actions.ts` | `formData.get("body") as string`     | No min-length check                                           |

The desk actions (`desk/[id]/actions.ts`) already did this correctly with
`z.string().cuid().parse(...)`. The role cast was the most dangerous: it accepted `"SUPER"` as a
valid `Role`, with the service's own `ASSIGNABLE_ROLES.includes(newRole)` guard being the only line
of defence.

**Fix applied:**

- `admin/users/actions.ts`: changed `import type { Role }` → `import { Role }` (runtime value needed
  for `z.nativeEnum`), then replaced both casts with `z.string().cuid().parse(...)` and
  `z.nativeEnum(Role).parse(...)`.
- `tickets/[id]/actions.ts`: replaced both casts with `z.string().cuid().parse(...)` and
  `z.string().min(1).parse(...)`.

---

### R2 — `deleteCategoryAction` had no error boundary

**Found:** The action had no try/catch and returned `void`:

```ts
// before
export async function deleteCategoryAction(formData: FormData): Promise<void> {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const id = formData.get("id") as string; // unvalidated cast
  await deleteCategory(id, payload); // errors propagated as unhandled 500
  revalidatePath("/admin/categories");
}
```

The service throws `Error("Cannot delete a category that has tickets")` and `AuthorizationError` for
cross-team access. Both hit Next.js's generic error page instead of showing an inline message to the
user. The page also used `action={deleteCategoryAction}` directly in a server component, making it
impossible to receive the error in the form.

**Fix applied:**

- `deleteCategoryAction` signature changed to
  `(_prevState: string | null, formData: FormData): Promise<string | null>`, wrapped in try/catch,
  and `id` validated with `z.string().cuid()`.
- New `DeleteCategoryForm.tsx` client component uses `useActionState(deleteCategoryAction, null)` so
  errors appear inline next to the Delete button.
- `admin/categories/page.tsx` now imports `DeleteCategoryForm` instead of the action directly.

---

## Open Issues

---

## 1. Security

### 1.1 `seedDemoUsers` silently swallows all DB errors

```ts
try {
  await db.user.create({ ... });
  created++;
} catch {
  // Skip users that already exist (P2002)
}
```

The catch block is too broad. A network timeout, a schema mismatch, or a DB constraint other than
P2002 will silently count as "already exists." The function returns `{ created: 0, total: 5 }` and
the caller has no way to detect failure. Should inspect `(err as {code?:string}).code === "P2002"`
before swallowing.

### 1.2 Hardcoded demo credentials in source

**Resolved.** The demo password is no longer in the frontend. `LoginForm` now renders one-click
login buttons per role; each button calls a `demoLoginAction` server action that holds the password
server-side only and is never shipped to the client bundle. The credentials hint UI has been removed
entirely.

---

## 2. Type Safety

### 2.1 Role enum used as string literals throughout

The code imports `Role` from `@/generated/prisma/enums` but frequently compares against raw strings:

```ts
// assertions.ts
if (payload.role === "SUPER") return;
if (payload.role === "REQUESTER" && ...)

// tickets/service.ts
session.role === "REQUESTER"
!["MANAGER", "ADMIN", "SUPER"].includes(session.role)

// proxy.ts
role !== "REQUESTER"
role !== "SUPER"
```

This works because TypeScript's string enum comparison is safe, but it's inconsistent with the
codebase's own pattern of importing and using the enum everywhere else. If the enum value ever
changes (e.g., `REQUESTER` → `CUSTOMER_REQUESTER`), the string literals won't trigger a type error —
the enum usage will. Use `Role.REQUESTER`, `Role.SUPER`, etc. consistently.

### 2.2 `transitionStatusAction` returns `void`, breaking the form error surface

```ts
export async function transitionStatusAction(formData: FormData): Promise<void>;
```

`StatusForm.tsx` catches errors with a generic message:

```ts
} catch {
  setError("Transition failed. Please try again.");
}
```

FSM `assertTransition` throws `AuthorizationError` with the specific message (e.g.,
`"IN_PROGRESS → ESCALATED requires MANAGER or higher"`). That message is lost. The action should
return `Promise<string | null>` and `StatusForm` should use `useActionState` to surface it, matching
the pattern used by `AssignForm` and `PriorityForm`.

---

## 3. Error Handling

### 3.1 Inconsistent action return types

Three patterns exist for error surfacing, with no apparent rule for which to use:

| Pattern                                    | Used in                                                                          | Problem                                |
| ------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------- |
| `Promise<string \| null>` (useActionState) | `assignTicket`, `setPriority`, `postDeskComment`, `createCategory`, `changeRole` | Correct — error reaches the form       |
| `Promise<void>` (no return)                | `transitionStatus`                                                               | Error is swallowed                     |
| `redirect()` inside try/catch              | `createTicketAction` → `redirect(ticketId)`                                      | Correct — redirect is the success path |

All mutations should return `Promise<string | null>`. The `void` pattern should be reserved for
fire-and-forget operations, not form submissions.

### 3.2 `createTicketAction` swallows Zod errors as generic messages

```ts
} catch (err) {
  unstable_rethrow(err);
  return "Failed to submit ticket. Please try again.";
}
```

A Zod parse failure (e.g., invalid `categoryId` CUID) and a DB error both become "Failed to submit
ticket." The service throws `ZodError` for bad input, which should ideally surface as field-level
feedback. At minimum, Zod errors and domain errors should produce different messages.

---

## 4. Code Duplication

### 4.1 Status and priority display maps repeated across five files

`STATUS_LABEL` and `STATUS_CLASS` are defined identically (or near-identically) in:

- `src/app/desk/page.tsx`
- `src/app/desk/[id]/page.tsx`
- `src/app/desk/[id]/StatusForm.tsx`
- `src/app/tickets/page.tsx`
- `src/app/tickets/[id]/page.tsx`
- `src/app/admin/dashboard/page.tsx` (inline via `STATUS_ROWS`)

`PRIORITY_LABEL` and `PRIORITY_CLASS` appear in at least three files.

This should be extracted to `src/lib/tickets/display.ts` and imported everywhere. Currently a label
wording change (e.g., "Waiting on requester" → "Awaiting requester") requires touching five files
and risks them drifting.

Note: `tickets/page.tsx` already uses `"Waiting on you"` for `WAITING_ON_REQUESTER` while
`desk/page.tsx` uses `"Waiting on requester"`. This inconsistency exists precisely because they're
maintained separately.

### 4.2 Fetch-assert-service boilerplate repeated in every page

Every server component follows the same three lines:

```ts
const session = await auth();
const payload = assertAuthenticated(session);
const data = await someService(payload);
```

This is fine and intentional (explicit is better than magic), but extracting a `getSession()` helper
that calls `auth()` + `assertAuthenticated()` and returns the typed payload would reduce the noise
while keeping the explicitness.

---

## 5. Performance

### 5.1 `getDashboardMetrics` loads all tickets for response time calculation

```ts
db.ticket.findMany({
  where: { teamId },     // no date filter, no take limit
  select: {
    createdAt: true,
    comments: { where: {...}, orderBy: {...}, take: 1, select: {...} },
  },
})
```

This is an unbounded scan. For a team with 10,000 tickets it fetches 10,000 rows into Node.js memory
to compute a single average. It also computes `avgResponseHours` across the entire team's history
while the other metrics are scoped to the last 30 days — an inconsistency in what the dashboard
shows.

A correct approach: add `createdAt: { gte: thirtyDaysAgo }` to match the other 30d stats, and if
precision is needed, compute the average in SQL with a subquery or a raw query.

### 5.2 Desk pagination exists in the service but is invisible in the UI

`listDeskTickets` accepts `page` and `pageSize` (default 25) via Zod. `DeskPage` calls it with no
page parameter, so users are silently capped at 25 tickets. A busy support team will miss tickets
without knowing. The desk inbox needs a "Load more" link or page navigation.

### 5.3 No Prisma connection pooling configuration

`src/lib/db.ts` uses `PrismaPg` with a raw connection string. Under concurrent Next.js requests
(especially in development with hot reload), this can exhaust `max_connections` on the PostgreSQL
container. For production, Prisma recommends either the `pg` pool config or Prisma Accelerate. This
is fine for a portfolio demo but worth noting in the README.

---

## 6. Missing Next.js Conventions

### 6.1 No `metadata` exports on any page

The App Router expects every page to export `metadata` (static) or `generateMetadata` (dynamic) for
the `<title>` and `<meta>` tags. No page in the project does this. Browsers show the Next.js default
title. For the portfolio specifically, this is a missed signal that the developer knows the App
Router conventions.

```ts
// example for desk/[id]/page.tsx
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await db.ticket.findUnique({ where: { id }, select: { subject: true } });
  return { title: ticket ? `${ticket.subject} — Awano` : "Ticket — Awano" };
}
```

### 6.2 No `loading.tsx` files (Suspense skeletons)

Every route fetches data in the server component. Without `loading.tsx` at the route segment level,
Next.js has no skeleton to show — the browser shows a blank page until the server renders. App
Router's streaming + `loading.tsx` pattern is a key differentiator over Pages Router. Even a simple
`<div className="animate-pulse ...">` skeleton would demonstrate this knowledge.

### 6.3 No `error.tsx` files (error boundaries)

Unhandled service errors (DB down, unexpected Prisma error) propagate to Next.js's default error
page. App Router supports per-route `error.tsx` client components that catch thrown errors and show
a recovery UI. Critical routes (desk detail, ticket detail) should have these.

---

## 7. Accessibility

### 7.1 Status transition buttons are not screen-reader friendly

```tsx
<button type="submit">→ {STATUS_LABEL[to]}</button>
```

The `→` character is read by some screen readers as "right arrow" or ignored. The button text
becomes "right arrow In progress" which is confusing. Use `aria-label` or replace `→` with a
CSS-only decoration (`aria-hidden="true"`).

### 7.2 Optimistic status badge has no live region

When `StatusForm` updates `optimisticStatus`, the badge updates visually but no `aria-live` region
announces the change to screen readers. Add `aria-live="polite"` on the badge container.

### 7.3 Pending states missing `aria-busy`

```tsx
<button disabled={pending}>Saving…</button>
```

Buttons and forms should set `aria-busy={pending}` so assistive technologies understand the
in-progress state.

### 7.4 No landmark regions or skip links

The app renders in a single `<div>` with no `<main>`, `<nav>`, or `<aside>` landmarks. Keyboard
users and screen reader users cannot skip to content. The sidebar in `desk/[id]/page.tsx` is a
visual aside with no semantic role.

---

## 8. Session / Auth

### 8.1 Role changes are not reflected until JWT expiry

The session uses `strategy: "jwt"`. If a MANAGER changes a user from SUPPORT to REQUESTER, that
user's JWT remains valid (containing `role: SUPPORT`) until it expires. They retain SUPPORT access
until the next login.

This is a well-known JWT trade-off. Industry mitigations include:

- Short JWT expiry (e.g., 15 minutes) + silent refresh
- A server-side session store (database or Redis) — switch `strategy: "database"`
- A version/revocation field on the User model checked in the `jwt` callback

For a portfolio demo this is acceptable as-is, but the trade-off should be documented.

### 8.2 SUPER user cannot access `/admin/*` routes

`proxy.ts` allows `/admin/*` for `["MANAGER", "ADMIN"]` only. SUPER is excluded. The SUPER service
functions (`listTeams`, etc.) have their own assertions, but if a SUPER admin ever needed to view
the admin dashboard directly, they'd be redirected to login. This is a design decision, but it
should be intentional, not accidental.

---

## 9. Data Model

### 9.1 `StatusEvent.fromStatus` is nullable by design but never explained

```prisma
fromStatus TicketStatus?
```

This allows recording the initial `OPEN` status at creation — `fromStatus: null, toStatus: OPEN`.
But the seed and the `transitionStatus` service never create an event on ticket creation, so
`fromStatus` is always non-null in practice. The intent should be clarified: either create an
initial event on `createTicket`, or make `fromStatus` non-nullable.

### 9.2 No `firstResponseAt` denormalized field

`getDashboardMetrics` computes average first response time by loading all tickets and their first
non-internal comment. A `firstResponseAt DateTime?` field on `Ticket` would make this a simple
`AVG()` aggregate and the query would be O(1) in size rather than O(tickets). Worth adding before
the data volume grows.

### 9.3 No soft-delete for tickets

Tickets can only transition to `CLOSED`, not be deleted. This is correct for an audit-trail system.
But there is no corresponding restriction on the Prisma schema level — `db.ticket.delete()` would
succeed. A `deletedAt DateTime?` field, or a Prisma middleware that throws on direct deletes, would
enforce this invariant at the ORM layer.

---

## 10. Test Coverage Gaps

142 tests across 5 files is solid for the service layer. Uncovered areas:

| Gap                                                                            | Risk                                                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/lib/admin/service.ts` — `getDashboardMetrics`                             | Complex parallel queries + response time math; easy to break silently           |
| `src/lib/teams/service.ts` — `createTeam`, `createUserInTeam`, `seedDemoUsers` | Password hashing, unique constraint handling, P2002 swallowing                  |
| `src/lib/tickets/service.ts` — `setPriority`                                   | Not covered at all — verifies the update call and auth path                     |
| `getTeamDetail` — not-found path                                               | Throws a plain `Error` instead of `AuthorizationError`; different from the rest |
| Response time math in `getDashboardMetrics`                                    | Off-by-one in millisecond → hour conversion; averaging logic                    |

For Playwright, the following behaviors are most critical to cover end-to-end:

1. Cross-team ticket isolation (SUPPORT from team-b accessing team-a ticket)
2. REQUESTER seeing only `isInternal: false` comments
3. FSM gate (SUPPORT attempting escalation → redirect or error)
4. Pagination on desk inbox (page 2 returns different results)

---

## 11. Minor / Style

- **`src/app/tickets/[id]/actions.ts`** calls `revalidatePath` after the `postComment` call but
  inside a try/catch that eats auth errors. A thrown `AuthorizationError` will be caught, returned
  as `"Failed to post reply"`, and then `revalidatePath` will not be called — this is correct but
  the structure is misleading. The `revalidatePath` should be inside the try block after the await,
  before the return.

- **`getDashboardMetrics` `topAssignees`**: the `where: { assigneeId: { not: null } }` filter
  prevents null groups, but the downstream `byId[g.assigneeId as string]` cast and optional chaining
  (`user?.name`) suggests this case was anticipated and handled defensively. The cast can be changed
  to a proper null check.

- **`src/lib/teams/service.ts`** has a module-private `isPrismaUniqueError` helper; the same check
  is duplicated inline in `src/lib/categories/service.ts` as
  `(err as { code?: string }).code === "P2002"`. Extract to `src/lib/db.ts` as
  `isPrismaUniqueViolation(err)` and share it.

- **`src/app/desk/[id]/page.tsx`** has `Promise.resolve(getAllowedTransitions(...))` —
  `getAllowedTransitions` is synchronous; wrapping it in `Promise.resolve` inside a `Promise.all` is
  misleading and unnecessary.

---

## Summary Priority Table

| #   | Issue                                                                           | Severity | Status     |
| --- | ------------------------------------------------------------------------------- | -------- | ---------- |
| R1  | Missing Zod validation in server actions (`userId`, `role` casts)               | High     | ✓ Resolved |
| R2  | `deleteCategoryAction` swallows errors, no UI feedback                          | High     | ✓ Resolved |
| 3   | `transitionStatusAction` returns void, FSM errors lost                          | Medium   | Open       |
| 4   | `STATUS_LABEL` / `STATUS_CLASS` duplicated across 5 files                       | Medium   | Open       |
| 5   | No `metadata` exports on any page                                               | Medium   | Open       |
| 6   | `getDashboardMetrics` unbounded ticket scan                                     | Medium   | Open       |
| 7   | Desk inbox silently capped at 25 tickets (no pagination UI)                     | Medium   | Open       |
| 8   | `seedDemoUsers` swallows all errors, not just P2002                             | Medium   | Open       |
| 9   | No `loading.tsx` skeleton screens                                               | Low      | Open       |
| 10  | Role enum string literals inconsistent with enum imports                        | Low      | Open       |
| 11  | Missing test coverage for `getDashboardMetrics`, `teams/service`, `setPriority` | Low      | Open       |
| 12  | Accessibility: no landmarks, no aria-live, no aria-busy                         | Low      | Open       |
| 13  | `isPrismaUniqueError` duplicated across two service files                       | Low      | Open       |
| 14  | Hardcoded demo password in source                                               | Low      | Resolved   |
