"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { demoLoginAction, loginAction } from "./actions";

const DEMO_ACCOUNTS = [
  { label: "Support", email: "support@awano.demo" },
  { label: "Manager", email: "manager@awano.demo" },
  { label: "Customer", email: "customer@awano.demo" },
  { label: "Recruiter", email: "recruiter@awano.demo" },
  { label: "Field Agent", email: "agent@awano.demo" },
];

function DemoButtons() {
  const [pending, startTransition] = useTransition();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleDemoLogin(email: string) {
    setPendingEmail(email);
    startTransition(async () => {
      const result = await demoLoginAction(email);
      if (result) {
        setError(result);
        setPendingEmail(null);
      }
    });
  }

  return (
    <div className="rounded-lg bg-accent-amber-surface border border-amber-100 px-3.5 py-3 space-y-2">
      <p className="text-xs font-semibold text-accent-amber-text">Try a demo account</p>
      <div className="flex flex-wrap gap-2">
        {DEMO_ACCOUNTS.map(({ label, email }) => (
          <button
            key={email}
            type="button"
            disabled={pending}
            onClick={() => handleDemoLogin(email)}
            className="grid flex-1 rounded-md px-3 py-2 text-xs font-medium bg-accent-amber-surface hover:bg-amber-200 text-accent-amber-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Reserve the widest of the two labels so the swap to
                "Signing in…" never resizes the button (and, via flex-1,
                never reflows the row). */}
            <span aria-hidden className="col-start-1 row-start-1 invisible whitespace-nowrap">
              {pendingEmail === email ? label : "Signing in…"}
            </span>
            <span className="col-start-1 row-start-1 justify-self-center whitespace-nowrap">
              {pendingEmail === email ? "Signing in…" : label}
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-danger-text">{error}</p>}
    </div>
  );
}

export function LoginForm({ defaultTeam }: { defaultTeam?: string }) {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {defaultTeam ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-fg">Team</label>
          <input type="hidden" name="team" value={defaultTeam} />
          <div className="w-full rounded-lg bg-surface-subtle px-3.5 py-2.5 text-sm text-fg-muted flex items-center justify-between">
            <span>{defaultTeam}</span>
            <Link
              href="/login"
              className="text-xs text-fg-subtle hover:text-primary transition-colors"
            >
              Sign in differently?
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex p-3.5 w-full rounded-lg bg-surface-subtle">
          <Link
            href="/login?team=demo"
            className="self-start text-xs text-fg-subtle hover:text-primary transition-colors"
          >
            Want to try the demo? →
          </Link>
        </div>
      )}

      {defaultTeam === "demo" ? (
        <DemoButtons />
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-fg">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-fg">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-danger-surface border border-danger-border px-3.5 py-2.5 text-sm text-danger-text">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-1 w-full h-12 rounded-lg bg-primary text-primary-fg text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </>
      )}

    </form>
  );
}
