import Link from "next/link";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listDeskTickets } from "@/lib/tickets/service";
import type { TicketStatus, TicketPriority } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
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

const PRIORITY_CLASS: Record<TicketPriority, string> = {
  LOW: "text-zinc-400",
  NORMAL: "text-zinc-500",
  HIGH: "text-amber-600",
  URGENT: "text-red-600 font-semibold",
};

const PRIORITY_LABEL: Record<TicketPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

function getFilters(view: string, userId: string) {
  switch (view) {
    case "mine":
      return { assigneeId: userId };
    case "open":
      return { status: "OPEN" as TicketStatus };
    case "escalated":
      return { status: "ESCALATED" as TicketStatus };
    default:
      return { assigneeId: null };
  }
}

export default async function DeskPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "unassigned" } = await searchParams;
  const session = await auth();
  const payload = assertAuthenticated(session);
  const tickets = await listDeskTickets(getFilters(view, payload.userId), payload);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900 mb-6">Inbox</h1>

      {tickets.length === 0 ? (
        <div className="rounded-xl shadow-card bg-white px-6 py-16 text-center">
          <p className="text-sm text-zinc-400">No tickets here.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/desk/${ticket.id}`}
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
                  <span className={PRIORITY_CLASS[ticket.priority]}>
                    {PRIORITY_LABEL[ticket.priority]}
                  </span>
                  <span>·</span>
                  <span>
                    {ticket.assignee
                      ? (ticket.assignee.name ?? ticket.assignee.email)
                      : "Unassigned"}
                  </span>
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
