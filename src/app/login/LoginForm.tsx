"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm({ defaultTeam }: { defaultTeam?: string }) {
  const [error, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/*
        Team field is only shown when a team slug is already known from the URL.
        Bare /login (no ?team=) skips this field entirely — that path is for
        platform admins (SUPER role) who have no team.
      */}
      {defaultTeam && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-700">Team</label>
          <input type="hidden" name="team" value={defaultTeam} />
          <div className="w-full rounded-lg bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-500 flex items-center justify-between">
            <span>{defaultTeam}</span>
            <Link
              href="/login"
              className="text-xs text-zinc-400 hover:text-primary transition-colors"
            >
              Sign in differently?
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-zinc-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-zinc-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg ring-input px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full h-12 rounded-lg bg-primary text-white text-base font-semibold hover:bg-primary-hover transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      {/*
        Demo credentials hint — only shown on the demo team login.
        Makes it easy for portfolio reviewers to get in without asking.
        Replace these with real seeded credentials before sharing.
      */}
      {defaultTeam === "demo" && (
        <div className="rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-3 text-xs text-amber-800 space-y-1">
          <p className="font-semibold">Demo credentials</p>
          <p>support@demo.com / demo1234</p>
          <p>requester@demo.com / demo1234</p>
        </div>
      )}
    </form>
  );
}
