import { vi, describe, it, expect, beforeEach } from "vitest";
import { Role, TicketStatus } from "@/generated/prisma/enums";
import { AuthorizationError, type SessionPayload } from "@/lib/auth/assertions";

vi.mock("@/lib/db", () => ({
  db: {
    ticket: {
      groupBy: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    statusEvent: {
      count: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
  },
}));

import { db } from "@/lib/db";
import { getDashboardMetrics } from "./service";

function session(overrides: Partial<SessionPayload> = {}): SessionPayload {
  return { userId: "manager-1", teamId: "team-a", role: Role.MANAGER, ...overrides };
}

function setupDefaultMocks() {
  vi.mocked(db.ticket.groupBy).mockResolvedValue([] as never);
  vi.mocked(db.ticket.count).mockResolvedValue(0 as never);
  vi.mocked(db.statusEvent.count).mockResolvedValue(0 as never);
  vi.mocked(db.ticket.findMany).mockResolvedValue([] as never);
  vi.mocked(db.user.findMany).mockResolvedValue([] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Role guard
// ---------------------------------------------------------------------------

describe("getDashboardMetrics — role guard", () => {
  it("throws when called by SUPPORT", async () => {
    await expect(getDashboardMetrics(session({ role: Role.SUPPORT }))).rejects.toThrow(
      AuthorizationError
    );
    expect(db.ticket.groupBy).not.toHaveBeenCalled();
  });

  it("throws when called by REQUESTER", async () => {
    await expect(getDashboardMetrics(session({ role: Role.REQUESTER }))).rejects.toThrow(
      AuthorizationError
    );
  });

  it("allows MANAGER", async () => {
    setupDefaultMocks();
    await expect(getDashboardMetrics(session({ role: Role.MANAGER }))).resolves.not.toThrow();
  });

  it("allows ADMIN", async () => {
    setupDefaultMocks();
    await expect(getDashboardMetrics(session({ role: Role.ADMIN }))).resolves.not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// teamId scoping
// ---------------------------------------------------------------------------

describe("getDashboardMetrics — teamId scoping", () => {
  it("scopes all queries to session teamId", async () => {
    setupDefaultMocks();
    await getDashboardMetrics(session({ teamId: "team-a" }));

    // Every groupBy and count call must include teamId
    for (const call of vi.mocked(db.ticket.groupBy).mock.calls) {
      expect((call[0] as { where: { teamId: string } }).where.teamId).toBe("team-a");
    }
    for (const call of vi.mocked(db.ticket.count).mock.calls) {
      expect((call[0] as { where: { teamId: string } }).where.teamId).toBe("team-a");
    }
    for (const call of vi.mocked(db.ticket.findMany).mock.calls) {
      expect((call[0] as { where: { teamId: string } }).where.teamId).toBe("team-a");
    }
  });
});

// ---------------------------------------------------------------------------
// statusCounts — zero-fills missing statuses
// ---------------------------------------------------------------------------

describe("getDashboardMetrics — statusCounts", () => {
  it("zero-fills statuses absent from groupBy results", async () => {
    setupDefaultMocks();
    vi.mocked(db.ticket.groupBy).mockResolvedValue([
      { status: TicketStatus.OPEN, _count: { status: 5 } },
    ] as never);

    const result = await getDashboardMetrics(session());

    expect(result.statusCounts.OPEN).toBe(5);
    expect(result.statusCounts.IN_PROGRESS).toBe(0);
    expect(result.statusCounts.ESCALATED).toBe(0);
    expect(result.statusCounts.RESOLVED).toBe(0);
    expect(result.statusCounts.CLOSED).toBe(0);
    expect(result.statusCounts.WAITING_ON_REQUESTER).toBe(0);
  });

  it("returns all zeros when no tickets exist", async () => {
    setupDefaultMocks();
    const result = await getDashboardMetrics(session());
    const allZero = Object.values(result.statusCounts).every((v) => v === 0);
    expect(allZero).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// avgResponseHours calculation
// ---------------------------------------------------------------------------

describe("getDashboardMetrics — avgResponseHours", () => {
  it("returns null when no tickets have a staff reply", async () => {
    setupDefaultMocks();
    vi.mocked(db.ticket.findMany).mockResolvedValue([
      { createdAt: new Date(), comments: [] },
    ] as never);

    const result = await getDashboardMetrics(session());
    expect(result.avgResponseHours).toBeNull();
  });

  it("calculates correct average in hours", async () => {
    setupDefaultMocks();
    const createdAt = new Date("2024-01-01T10:00:00Z");
    const repliedAt = new Date("2024-01-01T12:00:00Z"); // 2 hours later
    vi.mocked(db.ticket.findMany).mockResolvedValue([
      { createdAt, comments: [{ createdAt: repliedAt }] },
    ] as never);

    const result = await getDashboardMetrics(session());
    expect(result.avgResponseHours).toBeCloseTo(2, 5);
  });

  it("averages across multiple tickets", async () => {
    setupDefaultMocks();
    const base = new Date("2024-01-01T10:00:00Z");
    const twoHoursLater = new Date("2024-01-01T12:00:00Z");
    const fourHoursLater = new Date("2024-01-01T14:00:00Z");
    vi.mocked(db.ticket.findMany).mockResolvedValue([
      { createdAt: base, comments: [{ createdAt: twoHoursLater }] },
      { createdAt: base, comments: [{ createdAt: fourHoursLater }] },
    ] as never);

    const result = await getDashboardMetrics(session());
    expect(result.avgResponseHours).toBeCloseTo(3, 5); // (2 + 4) / 2
  });
});

// ---------------------------------------------------------------------------
// topAssignees
// ---------------------------------------------------------------------------

describe("getDashboardMetrics — topAssignees", () => {
  it("returns empty array when no assigned open tickets", async () => {
    setupDefaultMocks();
    const result = await getDashboardMetrics(session());
    expect(result.topAssignees).toEqual([]);
  });

  it("resolves assignee names from user lookup", async () => {
    setupDefaultMocks();
    vi.mocked(db.ticket.groupBy).mockResolvedValue([
      { assigneeId: "user-1", _count: { assigneeId: 3 } },
    ] as never);
    vi.mocked(db.user.findMany).mockResolvedValue([
      { id: "user-1", name: "Dan Support", email: "dan@example.com" },
    ] as never);

    const result = await getDashboardMetrics(session());
    expect(result.topAssignees).toEqual([
      { user: { id: "user-1", name: "Dan Support", email: "dan@example.com" }, count: 3 },
    ]);
  });

  it("scopes user lookup to session teamId", async () => {
    setupDefaultMocks();
    vi.mocked(db.ticket.groupBy).mockResolvedValue([
      { assigneeId: "user-1", _count: { assigneeId: 1 } },
    ] as never);
    vi.mocked(db.user.findMany).mockResolvedValue([] as never);

    await getDashboardMetrics(session({ teamId: "team-a" }));

    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teamId: "team-a" }) })
    );
  });
});
