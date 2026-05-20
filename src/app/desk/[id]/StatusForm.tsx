"use client";

import { useOptimistic, useTransition, useState } from "react";
import { transitionStatusAction } from "./actions";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN:                 "Open",
  IN_PROGRESS:          "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
  ESCALATED:            "Escalated",
  RESOLVED:             "Resolved",
  CLOSED:               "Closed",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN:                 "bg-zinc-100 text-zinc-600",
  IN_PROGRESS:          "bg-blue-50 text-blue-700",
  WAITING_ON_REQUESTER: "bg-amber-50 text-amber-700",
  ESCALATED:            "bg-red-50 text-red-700",
  RESOLVED:             "bg-green-50 text-green-700",
  CLOSED:               "bg-zinc-100 text-zinc-400",
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
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Status</span>
        <span
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
                setError(null);
                startTransition(async () => {
                  setOptimisticStatus(to);
                  try {
                    await transitionStatusAction(formData);
                  } catch {
                    setError("Transition failed. Please try again.");
                  }
                });
              }}
            >
              <input type="hidden" name="ticketId" value={ticketId} />
              <input type="hidden" name="toStatus" value={to} />
              <button
                type="submit"
                disabled={isPending}
                className="w-full text-left text-sm px-3 py-2 rounded-lg text-zinc-700 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                → {STATUS_LABEL[to]}
              </button>
            </form>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">No transitions available</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
