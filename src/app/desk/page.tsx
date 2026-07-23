import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listDeskTickets } from "@/lib/tickets/service";
import type { TicketStatus } from "@/generated/prisma/enums";
import { DeskTicketList } from "./DeskTicketList";

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
  searchParams: Promise<{ view?: string; q?: string }>;
}) {
  const { view = "unassigned", q } = await searchParams;
  const session = await auth();
  const payload = assertAuthenticated(session);
  const { items, nextCursor } = await listDeskTickets(
    { ...getFilters(view, payload.userId), ...(q ? { q } : {}) },
    payload
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-fg-strong mb-6">Inbox</h1>
      <DeskTicketList
        key={`${view}|${q ?? ""}`}
        initialItems={items}
        initialCursor={nextCursor}
        view={view}
        query={q}
      />
    </div>
  );
}
