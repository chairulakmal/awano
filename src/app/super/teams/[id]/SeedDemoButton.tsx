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
          className="px-4 py-2 bg-white border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {pending ? "Seeding…" : "Seed demo users"}
        </button>
      </form>
      {message && (
        <p className={`text-xs ${message.startsWith("Error") ? "text-red-600" : "text-zinc-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
