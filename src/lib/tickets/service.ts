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

const ListMyTicketsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
});

const ListDeskSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  assigneeId: z.union([z.string().cuid(), z.null()]).optional(), // null = unassigned filter
  cursor: z.string().optional(),
  limit: z.number().int().positive().max(100).default(10),
  q: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function createTicket(input: unknown, session: SessionPayload) {
  assertRole(session, ["REQUESTER"]);
  const data = CreateTicketSchema.parse(input);

  const category = await db.category.findUnique({ where: { id: data.categoryId }, select: { teamId: true } });
  if (!category || category.teamId !== session.teamId) {
    throw new AuthorizationError("Invalid category");
  }

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

export async function listMyTickets(input: unknown, session: SessionPayload) {
  assertRole(session, ["REQUESTER"]);
  const { cursor, limit } = ListMyTicketsSchema.parse(input ?? {});
  const rows = await db.ticket.findMany({
    where: { teamId: session.teamId!, createdById: session.userId },
    orderBy: { createdAt: "desc" },
    include: { category: true },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function listDeskTickets(filters: unknown, session: SessionPayload) {
  assertRole(session, ["SUPPORT", "MANAGER", "ADMIN"]);
  const { status, assigneeId, cursor, limit, q } = ListDeskSchema.parse(filters);
  const rows = await db.ticket.findMany({
    where: {
      teamId: session.teamId!,
      ...(status !== undefined ? { status } : {}),
      ...(assigneeId !== undefined ? { assigneeId } : {}),
      ...(q
        ? {
            OR: [
              { subject: { contains: q, mode: "insensitive" } },
              { body: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      createdBy: { select: { id: true, name: true, email: true } },
      assignee: { select: { id: true, name: true, email: true } },
    },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
  });
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? items[items.length - 1].id : null };
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

  if (assigneeId !== null) {
    const assignee = await db.user.findUnique({ where: { id: assigneeId }, select: { teamId: true } });
    if (!assignee || assignee.teamId !== ticket.teamId) {
      throw new AuthorizationError("Assignee is not a member of this team");
    }
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
