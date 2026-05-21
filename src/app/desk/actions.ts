"use server";

import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listDeskTickets } from "@/lib/tickets/service";
import type { TicketStatus } from "@/generated/prisma/enums";

function viewToFilters(view: string, userId: string) {
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

export async function loadMoreDeskTickets(cursor: string, view: string, query?: string) {
  const session = await auth();
  const payload = assertAuthenticated(session);
  return listDeskTickets(
    { ...viewToFilters(view, payload.userId), cursor, ...(query ? { q: query } : {}) },
    payload
  );
}
