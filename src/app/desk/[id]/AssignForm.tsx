"use client";

import { useActionState } from "react";
import { assignTicketAction } from "./actions";

type Member = { id: string; name: string | null; email: string };

export function AssignForm({
  ticketId,
  currentAssigneeId,
  members,
}: {
  ticketId: string;
  currentAssigneeId: string | null;
  members: Member[];
}) {
  const [error, formAction, pending] = useActionState(assignTicketAction, null);

  return (
    <form action={formAction} className="space-y-3">
      <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Assignee</span>
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="assigneeId"
        defaultValue={currentAssigneeId ?? ""}
        className="w-full rounded-lg ring-input px-3 py-2 text-sm text-zinc-900 outline-none transition"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name ?? m.email}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 text-sm font-medium text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update assignee"}
      </button>
    </form>
  );
}
