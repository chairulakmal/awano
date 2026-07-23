"use client";

import { useActionState } from "react";
import { setPriorityAction } from "./actions";
import type { TicketPriority } from "@/generated/prisma/enums";

const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

export function PriorityForm({
  ticketId,
  currentPriority,
}: {
  ticketId: string;
  currentPriority: TicketPriority;
}) {
  const [error, formAction, pending] = useActionState(setPriorityAction, null);

  return (
    <form key={currentPriority} action={formAction} className="space-y-3">
      <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Priority</span>
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="priority"
        defaultValue={currentPriority}
        className="w-full rounded-lg ring-input px-3 py-2 text-sm text-fg-strong outline-none transition"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger-text">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full py-2 text-sm font-medium text-fg-secondary bg-surface-subtle rounded-lg hover:bg-surface-subtle transition-colors disabled:opacity-50"
      >
        {pending ? "Saving…" : "Update priority"}
      </button>
    </form>
  );
}
