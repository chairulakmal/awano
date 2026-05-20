import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role, TicketStatus } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

// ---------------------------------------------------------------------------
// Mock Prisma — must be declared before importing the service
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    ticket: {
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      create:     vi.fn(),
      update:     vi.fn(),
    },
    comment:      { create: vi.fn() },
    statusEvent:  { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { db } from "@/lib/db";
import {
  createTicket,
  listMyTickets,
  listDeskTickets,
  getTicket,
  assignTicket,
  transitionStatus,
  postComment,
} from "./service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "user-1", teamId: "team-a", role: Role.SUPPORT, ...overrides };
}

function dbTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: "ticket-1",
    teamId: "team-a",
    createdById: "user-1",
    status: TicketStatus.OPEN,
    comments: [],
    statusEvents: [],
    ...overrides,
  };
}

beforeEach(() => { vi.clearAllMocks(); });

// ---------------------------------------------------------------------------
// Role guards
// ---------------------------------------------------------------------------

describe("createTicket — role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(createTicket({}, session({ role: Role.SUPPORT }))).rejects.toThrow(AuthorizationError);
    expect(db.ticket.create).not.toHaveBeenCalled();
  });

  it("throws when called by MANAGER", async () => {
    await expect(createTicket({}, session({ role: Role.MANAGER }))).rejects.toThrow(AuthorizationError);
  });

  it("accepts REQUESTER role (proceeds to Zod validation)", async () => {
    const s = session({ role: Role.REQUESTER });
    // Zod will throw next because input is invalid — but the role guard passed.
    await expect(createTicket({}, s)).rejects.not.toThrow(AuthorizationError);
  });
});

describe("listMyTickets — role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(listMyTickets(session({ role: Role.SUPPORT }))).rejects.toThrow(AuthorizationError);
    expect(db.ticket.findMany).not.toHaveBeenCalled();
  });
});

describe("listDeskTickets — role guard", () => {
  it("throws when called by REQUESTER", async () => {
    await expect(listDeskTickets({}, session({ role: Role.REQUESTER }))).rejects.toThrow(AuthorizationError);
    expect(db.ticket.findMany).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getTicket
// ---------------------------------------------------------------------------

describe("getTicket", () => {
  it("throws AuthorizationError when ticket is not found", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    await expect(getTicket("missing", session())).rejects.toThrow(AuthorizationError);
  });

  it("throws when REQUESTER tries to view another user's ticket", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(
      dbTicket({ createdById: "user-other" }) as never,
    );
    const s = session({ role: Role.REQUESTER, userId: "user-1" });
    await expect(getTicket("ticket-1", s)).rejects.toThrow(AuthorizationError);
  });

  it("throws on cross-team access", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(
      dbTicket({ teamId: "team-b" }) as never,
    );
    await expect(getTicket("ticket-1", session({ teamId: "team-a" }))).rejects.toThrow(AuthorizationError);
  });

  it("builds { isInternal: false } filter for REQUESTER", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.REQUESTER, userId: "user-1" });
    await getTicket("ticket-1", s);

    expect(db.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          comments: expect.objectContaining({ where: { isInternal: false } }),
        }),
      }),
    );
  });

  it("builds empty comments filter for SUPPORT", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    await getTicket("ticket-1", session({ role: Role.SUPPORT }));

    expect(db.ticket.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          comments: expect.objectContaining({ where: {} }),
        }),
      }),
    );
  });

  it("returns the ticket for SUPPORT viewing same-team ticket", async () => {
    const ticket = dbTicket();
    vi.mocked(db.ticket.findUnique).mockResolvedValue(ticket as never);
    const result = await getTicket("ticket-1", session({ role: Role.SUPPORT }));
    expect(result).toBe(ticket);
  });
});

// ---------------------------------------------------------------------------
// assignTicket
// ---------------------------------------------------------------------------

describe("assignTicket", () => {
  it("throws when ticket is not found", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    await expect(assignTicket("missing", "user-1", session())).rejects.toThrow(AuthorizationError);
    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  it("SUPPORT can assign to themselves", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    vi.mocked(db.ticket.update).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.SUPPORT, userId: "user-1" });
    await assignTicket("ticket-1", "user-1", s); // assigneeId === userId
    expect(db.ticket.update).toHaveBeenCalled();
  });

  it("SUPPORT cannot assign to a different user", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.SUPPORT, userId: "user-1" });
    await expect(assignTicket("ticket-1", "user-other", s)).rejects.toThrow(AuthorizationError);
    expect(db.ticket.update).not.toHaveBeenCalled();
  });

  it("MANAGER can assign to a different user", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    vi.mocked(db.ticket.update).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.MANAGER, userId: "user-1" });
    await assignTicket("ticket-1", "user-other", s);
    expect(db.ticket.update).toHaveBeenCalled();
  });

  it("SUPPORT can unassign (null assigneeId is allowed)", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    vi.mocked(db.ticket.update).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.SUPPORT, userId: "user-1" });
    // null !== "user-1", so this should throw — unassign requires MANAGER+
    await expect(assignTicket("ticket-1", null, s)).rejects.toThrow(AuthorizationError);
  });

  it("MANAGER can unassign (null assigneeId)", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    vi.mocked(db.ticket.update).mockResolvedValue(dbTicket() as never);
    await assignTicket("ticket-1", null, session({ role: Role.MANAGER, userId: "user-1" }));
    expect(db.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assigneeId: null } }),
    );
  });
});

// ---------------------------------------------------------------------------
// transitionStatus
// ---------------------------------------------------------------------------

describe("transitionStatus", () => {
  it("throws when ticket is not found", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    await expect(
      transitionStatus("missing", TicketStatus.IN_PROGRESS, session()),
    ).rejects.toThrow(AuthorizationError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("SUPPORT cannot escalate IN_PROGRESS → ESCALATED", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(
      dbTicket({ status: TicketStatus.IN_PROGRESS }) as never,
    );
    const s = session({ role: Role.SUPPORT });
    await expect(
      transitionStatus("ticket-1", TicketStatus.ESCALATED, s),
    ).rejects.toThrow(AuthorizationError);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("valid transition calls $transaction with ticket update and StatusEvent", async () => {
    const ticket = dbTicket({ status: TicketStatus.OPEN });
    vi.mocked(db.ticket.findUnique).mockResolvedValue(ticket as never);
    vi.mocked(db.$transaction).mockResolvedValue([
      { ...ticket, status: TicketStatus.IN_PROGRESS },
      {},
    ] as never);

    const s = session({ role: Role.SUPPORT, userId: "user-1" });
    await transitionStatus("ticket-1", TicketStatus.IN_PROGRESS, s);

    expect(db.$transaction).toHaveBeenCalled();
    expect(db.statusEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ticketId:   "ticket-1",
          actorId:    "user-1",
          fromStatus: TicketStatus.OPEN,
          toStatus:   TicketStatus.IN_PROGRESS,
        }),
      }),
    );
  });

  it("MANAGER can escalate IN_PROGRESS → ESCALATED", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(
      dbTicket({ status: TicketStatus.IN_PROGRESS }) as never,
    );
    vi.mocked(db.$transaction).mockResolvedValue([{}, {}] as never);
    await transitionStatus("ticket-1", TicketStatus.ESCALATED, session({ role: Role.MANAGER }));
    expect(db.$transaction).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// postComment
// ---------------------------------------------------------------------------

describe("postComment", () => {
  it("throws when ticket is not found", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(null);
    await expect(postComment("missing", "hello", false, session())).rejects.toThrow(AuthorizationError);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("REQUESTER cannot post an internal note", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    const s = session({ role: Role.REQUESTER, userId: "user-1" });
    await expect(postComment("ticket-1", "secret note", true, s)).rejects.toThrow(AuthorizationError);
    expect(db.comment.create).not.toHaveBeenCalled();
  });

  it("REQUESTER can post a public comment on their own ticket", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket({ createdById: "user-1" }) as never);
    vi.mocked(db.comment.create).mockResolvedValue({} as never);
    const s = session({ role: Role.REQUESTER, userId: "user-1" });
    await postComment("ticket-1", "hello", false, s);
    expect(db.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isInternal: false, authorId: "user-1" }),
      }),
    );
  });

  it("REQUESTER cannot comment on another user's ticket", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(
      dbTicket({ createdById: "user-other" }) as never,
    );
    const s = session({ role: Role.REQUESTER, userId: "user-1" });
    await expect(postComment("ticket-1", "hello", false, s)).rejects.toThrow(AuthorizationError);
  });

  it("SUPPORT can post an internal note", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    vi.mocked(db.comment.create).mockResolvedValue({} as never);
    await postComment("ticket-1", "internal note", true, session({ role: Role.SUPPORT }));
    expect(db.comment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isInternal: true }),
      }),
    );
  });

  it("throws on empty body (Zod validation)", async () => {
    vi.mocked(db.ticket.findUnique).mockResolvedValue(dbTicket() as never);
    await expect(postComment("ticket-1", "", false, session())).rejects.toThrow();
    expect(db.comment.create).not.toHaveBeenCalled();
  });
});
