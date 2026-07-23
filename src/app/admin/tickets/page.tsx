import { auth } from "@/auth";
import { assertAuthenticated, assertRole } from "@/lib/auth/assertions";
import { listDeskTickets } from "@/lib/tickets/service";
import { AllTicketList } from "./AllTicketList";
import type { TicketStatus } from "@/generated/prisma/enums";
import { TicketStatusFilter } from "./TicketStatusFilter";

const VALID_STATUSES = new Set<string>([
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_REQUESTER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
]);

export default async function AllTicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status: rawStatus, q } = await searchParams;
  const status =
    rawStatus && VALID_STATUSES.has(rawStatus) ? (rawStatus as TicketStatus) : undefined;

  const session = await auth();
  const payload = assertAuthenticated(session);
  assertRole(payload, ["MANAGER", "ADMIN", "SUPER"]);

  const { items, nextCursor } = await listDeskTickets(
    { ...(status ? { status } : {}), ...(q ? { q } : {}) },
    payload,
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg-strong mb-6">All Tickets</h1>
      <TicketStatusFilter currentStatus={status} currentQuery={q} />
      <AllTicketList
        key={`${status ?? "all"}|${q ?? ""}`}
        initialItems={items}
        initialCursor={nextCursor}
        status={status}
        query={q}
      />
    </div>
  );
}
