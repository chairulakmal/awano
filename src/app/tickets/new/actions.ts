"use server";

import { redirect } from "next/navigation";
import { unstable_rethrow } from "next/navigation";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { createTicket } from "@/lib/tickets/service";

export async function createTicketAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);

  let ticketId: string;
  try {
    const ticket = await createTicket(
      {
        categoryId: formData.get("categoryId"),
        subject: formData.get("subject"),
        body: formData.get("body"),
      },
      payload
    );
    ticketId = ticket.id;
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to submit ticket. Please try again.";
  }

  redirect(`/tickets/${ticketId}`);
}
