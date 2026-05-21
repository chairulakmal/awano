"use server";

import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { listMyTickets } from "@/lib/tickets/service";

export async function loadMoreMyTickets(cursor: string) {
  const session = await auth();
  const payload = assertAuthenticated(session);
  return listMyTickets({ cursor }, payload);
}
