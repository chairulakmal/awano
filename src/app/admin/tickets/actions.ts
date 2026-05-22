"use server";

import { auth } from "@/auth";
import { assertAuthenticated, assertRole } from "@/lib/auth/assertions";
import { listDeskTickets } from "@/lib/tickets/service";
import type { TicketStatus } from "@/generated/prisma/enums";

export async function loadMoreAllTickets(
  cursor: string,
  status?: TicketStatus,
  query?: string,
) {
  const session = await auth();
  const payload = assertAuthenticated(session);
  assertRole(payload, ["MANAGER", "ADMIN", "SUPER"]);
  return listDeskTickets(
    {
      ...(status ? { status } : {}),
      ...(query ? { q: query } : {}),
      cursor,
    },
    payload,
  );
}
