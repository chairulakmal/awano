import Link from "next/link";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listMyTickets } from "@/lib/tickets/service";
import { TicketList } from "./TicketList";

export default async function MyTicketsPage() {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const { items, nextCursor } = await listMyTickets({}, payload);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-2xl font-semibold text-fg-strong">My tickets</h1>
        <Link
          href="/tickets/new"
          className="px-4 py-2 bg-primary text-primary-fg text-sm font-semibold rounded-lg hover:bg-primary-hover transition-colors shadow-sm"
        >
          New ticket
        </Link>
      </div>
      <TicketList initialItems={items} initialCursor={nextCursor} />
    </div>
  );
}
