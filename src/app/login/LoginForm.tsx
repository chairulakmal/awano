"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { loginAction } from "./actions";

const DEMO_PASSWORD = "oretachinomachida";
const DEMO_ACCOUNTS = [
  { label: "Support", email: "support@awano.demo" },
  { label: "Customer", email: "customer@awano.demo" },
  { label: "Manager", email: "manager@awano.demo" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="ml-2 rounded px-2 py-1 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-700 transition-colors shrink-0"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function DemoCredentials() {
  return (
    <div className="rounded-lg bg-amber-50 border border-amber-100 px-3.5 py-3 text-xs text-amber-800 space-y-2">
      <p className="font-semibold">Demo credentials</p>
      {DEMO_ACCOUNTS.map(({ label, email }) => (
        <div key={email} className="flex items-center justify-between gap-2">
          <span className="text-amber-600">{label}:</span>
          <div className="flex items-center min-w-0">
            <span className="truncate font-mono">{email}</span>
            <CopyButton text={email} />
          </div>
        </div>
      ))}
      <div className="mt-1 pt-2 border-t border-amber-100 rounded-md bg-amber-100/60 px-2.5 py-2 flex items-center justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-amber-500 text-[10px] uppercase tracking-wide font-semibold">Password · all accounts</span>
          <span className="font-mono text-amber-900">{DEMO_PASSWORD}</span>
        </div>
        <CopyButton text={DEMO_PASSWORD} />
      </div>
    </div>
  );
}

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
        <DemoCredentials />
      )}
    </form>
  );
}
