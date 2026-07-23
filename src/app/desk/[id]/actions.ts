"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { assertAuthenticated, AuthenticationError, AuthorizationError } from "@/lib/auth/assertions";
import { transitionStatus, assignTicket, postComment, setPriority } from "@/lib/tickets/service";
import { addAttachment } from "@/lib/attachments/service";
import { TicketStatus, TicketPriority } from "@/generated/prisma/enums";

export async function transitionStatusAction(formData: FormData): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const to = z.nativeEnum(TicketStatus).parse(formData.get("toStatus"));
  try {
    await transitionStatus(ticketId, to, payload);
    revalidatePath(`/desk/${ticketId}`);
  } catch (err) {
    unstable_rethrow(err);
    // Surface the real message for the errors we author; stay generic otherwise.
    return err instanceof AuthorizationError || err instanceof AuthenticationError
      ? err.message
      : "Transition failed. Please try again.";
  }
  return null;
}

export async function assignTicketAction(
  _prevState: string | null,
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const raw = formData.get("assigneeId");
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
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);
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
  formData: FormData
): Promise<string | null> {
  const session = await auth();
  const payload = assertAuthenticated(session);
  const ticketId = z.string().min(1).parse(formData.get("ticketId"));
  const body = z.string().min(1).parse(formData.get("body"));
  const isInternal = formData.get("isInternal") === "true";

  let commentId: string;
  try {
    const comment = await postComment(ticketId, body, isInternal, payload);
    commentId = comment.id;
  } catch (err) {
    unstable_rethrow(err);
    return "Failed to post comment.";
  }

  const files = formData.getAll("attachments") as File[];
  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    try {
      const buffer = new Uint8Array(await file.arrayBuffer());
      await addAttachment(
        { ticketId, commentId, filename: file.name, mimeType: file.type, data: buffer },
        payload
      );
    } catch {
      // Attachment failure does not roll back the comment
    }
  }

  revalidatePath(`/desk/${ticketId}`);
  return null;
}
