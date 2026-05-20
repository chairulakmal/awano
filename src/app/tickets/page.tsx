import Link from "next/link";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listMyTickets } from "@/lib/tickets/service";
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

export default async function MyTicketsPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const tickets = await listMyTickets(payload);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">My tickets</h1>
          <p className="text-sm text-zinc-500 mt-1">{tickets.length} total</p>
        </div>
        <Link
          href="/tickets/new"
          className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          New ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl shadow-card bg-white px-6 py-16 text-center">
          <p className="text-sm text-zinc-400">No tickets yet.</p>
          <Link
            href="/tickets/new"
            className="mt-3 inline-block text-sm font-medium text-primary hover:text-primary-hover transition-colors"
          >
            Submit your first ticket →
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/tickets/${ticket.id}`}
                className="block rounded-xl shadow-card bg-white px-5 py-4 hover:shadow-panel transition-shadow"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-medium text-zinc-900 truncate">
                    {ticket.subject}
                  </span>
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
      )}
    </div>
  );
}
