"use client";

import { useOptimistic, useTransition } from "react";
import { transitionStatusAction } from "./actions";
import { useToast } from "@/components/Toast";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN: "bg-surface-subtle text-fg-secondary",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  WAITING_ON_REQUESTER: "bg-accent-amber-surface text-accent-amber-text",
  ESCALATED: "bg-danger-surface text-danger-text",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-surface-subtle text-fg-subtle",
};

export function StatusForm({
  ticketId,
  currentStatus,
  allowedTransitions,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
  allowedTransitions: TicketStatus[];
}) {
  const [optimisticStatus, setOptimisticStatus] = useOptimistic(currentStatus);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-fg-muted uppercase tracking-wide">Status</span>
        <span
          data-testid="ticket-status"
          className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[optimisticStatus]}`}
        >
          {STATUS_LABEL[optimisticStatus]}
        </span>
      </div>

      {allowedTransitions.length > 0 ? (
        <div className="space-y-1.5">
          {allowedTransitions.map((to) => (
            <form
              key={to}
              action={async (formData) => {
                startTransition(async () => {
                  setOptimisticStatus(to);
                  const error = await transitionStatusAction(formData);
                  if (error) {
                    toast(error, "error");
                  } else {
                    toast(`Moved to ${STATUS_LABEL[to]}`, "success");
                  }
                });
              }}
            >
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="toStatus" value={to} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full text-left text-sm px-3 py-2 rounded-lg text-fg hover:bg-surface-subtle transition-colors disabled:opacity-50"
              >
                → {STATUS_LABEL[to]}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-xs text-fg-subtle">No transitions available</p>
      )}
    </div>
  );
}
