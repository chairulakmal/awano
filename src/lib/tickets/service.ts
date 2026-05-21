import { z } from "zod";
import { db } from "@/lib/db";
import { TicketStatus, TicketPriority } from "@/generated/prisma/enums";
import {
  assertRole,
  assertCanViewTicket,
  assertCanUpdateTicket,
  AuthorizationError,
  type SessionPayload,
} from "@/lib/auth/assertions";
import { assertTransition } from "./fsm";

// ---------------------------------------------------------------------------
// Input schemas
// ---------------------------------------------------------------------------

const CreateTicketSchema = z.object({
  categoryId: z.string().cuid(),
  subject: z.string().min(1).max(255),
  body: z.string().min(1),
});

const ListDeskSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  assigneeId: z.union([z.string().cuid(), z.null()]).optional(), // null = unassigned filter
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(25),
});

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createTicket(input: unknown, session: SessionPayload) {
  assertRole(session, ["REQUESTER"]);
  const data = CreateTicketSchema.parse(input);
  return db.ticket.create({
    data: {
      teamId: session.teamId!,
      createdById: session.userId,
      categoryId: data.categoryId,
      subject: data.subject,
      body: data.body,
    },
  });
}

export async function listMyTickets(session: SessionPayload) {
  assertRole(session, ["REQUESTER"]);
  return db.ticket.findMany({
    where: { teamId: session.teamId!, createdById: session.userId },
    orderBy: { createdAt: "desc" },
    include: { category: true },
  });
}

export async function listDeskTickets(filters: unknown, session: SessionPayload) {
  assertRole(session, ["SUPPORT", "MANAGER", "ADMIN"]);
  const { status, assigneeId, page, pageSize } = ListDeskSchema.parse(filters);
  return db.ticket.findMany({
    where: {
      teamId: session.teamId!,
      ...(status !== undefined ? { status } : {}),
      ...(assigneeId !== undefined ? { assigneeId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
}

export async function getTicket(id: string, session: SessionPayload) {
  const attachmentMeta = { select: { id: true, filename: true, mimeType: true, sizeBytes: true } };

  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
      attachments: { ...attachmentMeta, where: { commentId: null }, orderBy: { createdAt: "asc" } },
      comments: {
        where: session.role === "REQUESTER" ? { isInternal: false } : {},
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, name: true, role: true } },
          attachments: { ...attachmentMeta, orderBy: { createdAt: "asc" } },
        },
      },
      statusEvents: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { id: true, name: true } } },
      },
    },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanViewTicket(session, ticket);
  return ticket;
}

export async function assignTicket(id: string, assigneeId: string | null, session: SessionPayload) {
  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { teamId: true, createdById: true },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanUpdateTicket(session, ticket);

  // Assigning to someone other than yourself requires MANAGER+
  if (assigneeId !== session.userId && !["MANAGER", "ADMIN", "SUPER"].includes(session.role)) {
    throw new AuthorizationError("Assigning to another user requires MANAGER or higher");
  }

  return db.ticket.update({ where: { id }, data: { assigneeId } });
}

export async function transitionStatus(id: string, to: TicketStatus, session: SessionPayload) {
  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { teamId: true, createdById: true, status: true },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanUpdateTicket(session, ticket);
  assertTransition(ticket.status, to, session.role);

  const [updated] = await db.$transaction([
    db.ticket.update({ where: { id }, data: { status: to } }),
    db.statusEvent.create({
      data: { ticketId: id, actorId: session.userId, fromStatus: ticket.status, toStatus: to },
    }),
  ]);
  return updated;
}

export async function setPriority(id: string, priority: TicketPriority, session: SessionPayload) {
  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { teamId: true, createdById: true },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanUpdateTicket(session, ticket);
  return db.ticket.update({ where: { id }, data: { priority } });
}

export async function postComment(
  id: string,
  body: string,
  isInternal: boolean,
  session: SessionPayload
) {
  z.string().min(1).parse(body);
  z.boolean().parse(isInternal);

  const ticket = await db.ticket.findUnique({
    where: { id },
    select: { teamId: true, createdById: true },
  });
  if (!ticket) throw new AuthorizationError("Ticket not found");
  assertCanViewTicket(session, ticket);

  if (isInternal && session.role === "REQUESTER") {
    throw new AuthorizationError("Requesters cannot post internal notes");
  }

  return db.comment.create({
    data: { ticketId: id, authorId: session.userId, body, isInternal },
  });
}
