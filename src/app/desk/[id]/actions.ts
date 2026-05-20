"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated } from "@/lib/auth/assertions";
import { transitionStatus, assignTicket, postComment, setPriority } from "@/lib/tickets/service";
import { TicketStatus, TicketPriority } from "@/generated/prisma/enums";

export async function transitionStatusAction(formData: FormData): Promise<void> {
  const session  = await auth();
  const payload  = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const to       = z.nativeEnum(TicketStatus).parse(formData.get("toStatus"));
  await transitionStatus(ticketId, to, payload);
  revalidatePath(`/desk/${ticketId}`);
}

export async function assignTicketAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session  = await auth();
  const payload  = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const raw      = formData.get("assigneeId");
  const assigneeId = !raw || raw === "" ? null : z.string().cuid().parse(raw);

  try {
    await assignTicket(ticketId, assigneeId, payload);
    revalidatePath(`/desk/${ticketId}`);
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to update assignee.";
  }
  return null;
}

export async function setPriorityAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session  = await auth();
  const payload  = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const priority = z.nativeEnum(TicketPriority).parse(formData.get("priority"));

  try {
    await setPriority(ticketId, priority, payload);
    revalidatePath(`/desk/${ticketId}`);
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to update priority.";
  }
  return null;
}

export async function postDeskCommentAction(
  _prevState: string | null,
  formData: FormData,
): Promise<string | null> {
  const session    = await auth();
  const payload    = assertAuthenticated(session);
  const ticketId   = z.string().min(1).parse(formData.get("ticketId"));
  const body       = z.string().min(1).parse(formData.get("body"));
  const isInternal = formData.get("isInternal") === "true";

  try {
    await postComment(ticketId, body, isInternal, payload);
    revalidatePath(`/desk/${ticketId}`);
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to post comment.";
  }
  return null;
}
