"use client";

import { useActionState } from "react";
import { assignTicketAction } from "./actions";
import type { Role } from "@/generated/prisma/enums";

type Member = { id: string; name: string | null; email: string };

export function AssignForm({
  ticketId,
  currentAssigneeId,
  members,
  userId,
  role,
}: {
  ticketId: string;
  currentAssigneeId: string | null;
  members: Member[];
  userId: string;
  role: Role;
}) {
  const [error, formAction, pending] = useActionState(assignTicketAction, null);

  const canEdit = ["SUPPORT", "MANAGER", "ADMIN", "SUPER"].includes(role);
  const canAssignOthers = ["MANAGER", "ADMIN", "SUPER"].includes(role);

  // SUPPORT may only assign to themselves; MANAGER+ sees the full team list
  const selectableMembers = canAssignOthers
    ? members
    : members.filter((m) => m.id === userId);

  const currentMember = members.find((m) => m.id === currentAssigneeId);

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Assignee</span>
        <p className="text-sm text-fg">
          {currentMember ? (currentMember.name ?? currentMember.email) : "Unassigned"}
        </p>
      </div>
    );
  }

  return (
    <form key={currentAssigneeId} action={formAction} className="space-y-3">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Assignee</span>
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="assigneeId"
        defaultValue={currentAssigneeId ?? ""}
        className="w-full rounded-lg ring-input px-3 py-2 text-sm text-fg-strong outline-none transition"
      >
        <option value="">Unassigned</option>
        {selectableMembers.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name ?? m.email}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-text">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 text-sm font-medium text-fg-secondary bg-surface-subtle rounded-lg hover:bg-surface-subtle transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update assignee"}
      </button>
    </form>
  );
}
