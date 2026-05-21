"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { loadMoreMyTickets } from "./actions";
import type { TicketStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on you",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const STATUS_CLASS: Record<TicketStatus, string> = {
  OPEN: "bg-zinc-100 text-zinc-600",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  WAITING_ON_REQUESTER: "bg-amber-50 text-amber-700",
  ESCALATED: "bg-red-50 text-red-700",
  RESOLVED: "bg-green-50 text-green-700",
  CLOSED: "bg-zinc-100 text-zinc-400",
};

type MyTicket = Awaited<ReturnType<typeof loadMoreMyTickets>>["items"][number];

export function TicketList({
  initialItems,
  initialCursor,
}: {
  initialItems: MyTicket[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();

  function handleLoadMore() {
    if (!cursor) return;
    startTransition(async () => {
      const result = await loadMoreMyTickets(cursor);
      setItems((prev) => [...prev, ...result.items]);
      setCursor(result.nextCursor);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl shadow-card bg-white px-6 py-16 text-center">
        <p className="text-sm text-zinc-400">No tickets yet.</p>
        <Link
          href="/tickets/new"
          className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover transition-colors"
        >
          Submit your first ticket →
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((ticket) => (
          <li key={ticket.id}>
            <Link
              href={`/tickets/${ticket.id}`}
              className="block rounded-xl shadow-card bg-white px-5 py-4 hover:shadow-panel transition-shadow"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-900 truncate">{ticket.subject}</span>
                <span
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CLASS[ticket.status]}`}
                >
                  {STATUS_LABEL[ticket.status]}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400">
                <span>{ticket.category.name}</span>
                <span>·</span>
                <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {cursor && (
        <div className="mt-4 text-center">
          <button
            onClick={handleLoadMore}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-zinc-600 bg-white rounded-lg shadow-card hover:shadow-panel transition-shadow disabled:opacity-50"
          >
            {isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </>
  );
}
