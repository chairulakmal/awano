import { db } from "@/lib/db";
import {
  assertCanViewTicket,
  AuthorizationError,
  type SessionPayload,
} from "@/lib/auth/assertions";

const MAX_BYTES = 1_000_000; // 1 MB hard limit, enforced independently of client-side compression

// Server-side allowlist: matches compress.ts accepted types plus WebP (compression output).
// Rejects arbitrary MIME types that could be rendered as HTML by browsers and enable XSS.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

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
  if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
    throw new Error("Unsupported file type.");
  }

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
