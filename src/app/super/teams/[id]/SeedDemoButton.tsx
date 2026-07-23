"use client";

import { useActionState } from "react";
import { seedDemoAction } from "./actions";

export function SeedDemoButton({ teamId }: { teamId: string }) {
  const [message, formAction, pending] = useActionState(seedDemoAction, null);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="teamId" value={teamId} />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 bg-surface border border-border text-fg text-sm font-medium rounded-lg hover:bg-surface-muted transition-colors shadow-sm disabled:opacity-50"
        >
          {pending ? "Seeding…" : "Seed demo users"}
        </button>
      </form>
      {message && (
        <p className={`text-xs ${message.startsWith("Error") ? "text-danger-text" : "text-fg-muted"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
