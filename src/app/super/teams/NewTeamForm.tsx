"use client";

import { useActionState, useRef, useEffect } from "react";
import { createTeamAction } from "./actions";

export function NewTeamForm() {
  const [error, formAction, pending] = useActionState(createTeamAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !error) ref.current?.reset();
  }, [pending, error]);

  return (
    <form ref={ref} action={formAction} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="name"
          required
          placeholder="Team name"
          className="rounded-lg ring-input px-3.5 py-2 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition"
        />
        <input
          name="slug"
          required
          placeholder="slug (e.g. acme)"
          pattern="[a-z0-9-]+"
          title="Lowercase letters, numbers, and hyphens only"
          className="rounded-lg ring-input px-3.5 py-2 text-sm text-fg-strong placeholder:text-fg-subtle font-mono outline-none transition"
        />
      </div>
      <textarea
        name="notes"
        placeholder="Notes (optional)"
        rows={2}
        className="w-full rounded-lg ring-input px-3.5 py-2 text-sm text-fg-strong placeholder:text-fg-subtle outline-none transition resize-none"
      />
      {error && <p className="text-xs text-danger-text">{error}</p>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create team"}
        </button>
      </div>
    </form>
  );
}
