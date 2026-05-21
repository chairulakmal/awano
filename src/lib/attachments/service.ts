import { db } from "@/lib/db";
import {
  assertCanViewTicket,
  AuthorizationError,
  type SessionPayload,
} from "@/lib/auth/assertions";

const MAX_BYTES = 1_000_000; // 1 MB hard limit — enforced independently of client-side compression

export async function addAttachment(
  input: {
    ticketId: string;
    commentId?: string;
    filename: string;
    mimeType: string;
    data: Uint8Array<ArrayBuffer>;
  },
  session: SessionPayload
) {
  if (input.data.length > MAX_BYTES) {
    throw new Error("Attachment exceeds 1 MB limit.");
  }

  const ticket = await db.ticket.findUnique({
    where: { id: input.ticketId },
    select: { teamId: true, createdById: true },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanViewTicket(session, ticket);

  return db.attachment.create({
    data: {
      ticketId: input.ticketId,
      commentId: input.commentId,
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      data: input.data,
    },
  });
}

export async function getAttachment(id: string, session: SessionPayload) {
  const attachment = await db.attachment.findUnique({
    where: { id },
    include: { ticket: { select: { teamId: true, createdById: true } } },
  });
  if (!attachment) throw new AuthorizationError("Attachment not found");
  assertCanViewTicket(session, attachment.ticket);
  return attachment;
}
