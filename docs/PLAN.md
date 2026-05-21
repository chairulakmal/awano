# Awano — Plan

Full engineering design: [SPEC.md](SPEC.md) · Full v1 build history: [PLANv1.md](PLANv1.md)

---

## v1 — Shipped

| Area | What was built |
|---|---|
| **Multi-tenant auth** | Auth.js v5 Credentials, bcrypt (cost 12), stateless JWT in `httpOnly` cookie, team-slug login |
| **Role-based access** | Five roles (Requester → Support → Manager → Admin → Super); route guards in `proxy.ts`; every DB query scoped to `teamId` |
| **Ticket workflow** | FSM with 9 valid transitions; `StatusEvent` audit trail written atomically with each transition via `$transaction` |
| **Support desk** | Inbox views (Unassigned / Mine / Open / Escalated), assign, priority, internal notes, optimistic status transitions |
| **File attachments** | `bytea` storage, 1 MB limit, Canvas API browser compression, server-side MIME allowlist (stored XSS prevention) |
| **Ticket search** | `ILIKE` on subject and body, debounced sidebar input, scoped to `teamId` |
| **Pagination** | Cursor-based on all ticket lists; "Load more"; offset `skip` avoided to prevent stale pages under concurrent writes |
| **Security hardening** | HSTS, `X-Frame-Options`, rate limiting on login + password change, session eviction after password change |
| **Admin & super** | Dashboard metrics, user/role management, category CRUD, team provisioning |
| **CI/CD** | GitHub Actions (lint → tsc → vitest → build) on every PR; Railway + pre-deploy migrations; `main` branch protection |
| **Tests** | 169 unit tests (Prisma mocked), 7 Playwright E2E specs |

---

## v2 — English + Japanese UI

### Queue

| # | What | Effort |
|---|------|--------|
| 1 | **i18n infrastructure** — `next-intl`, `[locale]` routing, locale detection, message catalogs | M |
| 2 | **Requester routes in Japanese** — `/login`, `/tickets/*` | S |
| 3 | **Desk and admin routes in Japanese** — `/desk/*`, `/admin/*`, `/super/*`, `/profile` | S |
| 4 | **Locale switcher** — EN / JP toggle in the header | XS |
| 5 | **E2E tests** — update URL structure, add locale-switch smoke test | S |

---

### Routing

Wrap the entire `app/` directory under `app/[locale]/`. All routes gain a locale prefix:
`/tickets` → `/en/tickets` and `/ja/tickets`.

```
app/
  [locale]/
    login/
    tickets/
    desk/
    admin/
    super/
    profile/
```

`proxy.ts` route guard matchers update from `/desk/*` to `/:locale/desk/*`.

**Locale detection order** (resolved in `proxy.ts`):
1. URL prefix — `/en/…` or `/ja/…`
2. `NEXT_LOCALE` cookie set by the switcher
3. `Accept-Language` request header
4. Default: `en`

Bare `/` redirects to the detected locale.

---

### Message catalogs

```
messages/
  en.json
  ja.json
```

Flat keys namespaced by component — `login.emailLabel`, `tickets.noTickets`,
`desk.internalNote`. Status enum display names (`OPEN` → `"Open"` / `"対応待ち"`) live
here too. Ticket `subject` and `body` are user content — not translated.

---

### Japanese font

`Noto Sans JP` loaded via `next/font/google`. In `output: "standalone"` mode Next.js
self-hosts the font at build time — no Google CDN request in production, and the font is
included in the standalone output automatically.

Load it only when locale is `ja` to avoid shipping ~1 MB of Japanese glyphs to English users:

```ts
// src/app/[locale]/layout.tsx
import { Noto_Sans_JP } from "next/font/google";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export default function LocaleLayout({ children, params: { locale } }) {
  return (
    <html lang={locale} className={locale === "ja" ? notoSansJP.className : ""}>
      {children}
    </html>
  );
}
```

---

### Japanese form input (IME)

Japanese text entry goes through an IME — the user types romaji, selects kanji/kana
candidates, then confirms. During composition, `onChange` fires on every keystroke before
the final character is committed.

**Problem:** the debounced search in `DeskSidebar.tsx` fires mid-composition, sending
incomplete romaji to the server (e.g. `"vi"` instead of `"ビザ"`).

**Fix:** suppress the debounce timer during IME composition using the browser's
`compositionstart` / `compositionend` events.

```ts
const isComposing = useRef(false);

<input
  onCompositionStart={() => { isComposing.current = true; }}
  onCompositionEnd={(e) => {
    isComposing.current = false;
    handleSearch(e); // fire once composition is confirmed
  }}
  onChange={(e) => {
    if (isComposing.current) return; // suppress during composition
    handleSearch(e);
  }}
/>
```

This applies to any debounced or auto-submitting input: ticket search, any future
typeahead. Regular form submits (press Enter / click button) are unaffected — the browser
will not submit during active composition.

---

### Locale switcher

A `LocaleSwitcher` client component placed in `Header.tsx` alongside `UserMenu`.

```ts
"use client";
import { useRouter, usePathname } from "next/navigation";

export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: string) {
    // Replace the current locale segment in the path
    const newPath = pathname.replace(`/${locale}`, `/${next}`);
    router.push(newPath);
  }

  return (
    <div>
      <button onClick={() => switchTo("en")} aria-current={locale === "en"}>EN</button>
      <button onClick={() => switchTo("ja")} aria-current={locale === "ja"}>JP</button>
    </div>
  );
}
```

`proxy.ts` reads the `NEXT_LOCALE` cookie (set by `next-intl` on navigation) and uses it
as the fallback locale on the next visit. No flag icons — flags map to countries, not languages.

---

### Date and number formatting

`next-intl`'s `useFormatter()` reads the active locale — no additional library needed.

```ts
const format = useFormatter();
format.dateTime(createdAt, { dateStyle: "medium" });
// "May 21, 2026"  →  "2026年5月21日"
```

---

### What stays unchanged

The service layer, authorization logic, Prisma schema, and all business rules are
locale-agnostic. i18n is entirely a UI-layer concern.
