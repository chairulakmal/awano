import { db } from "@/lib/db";
import { assertRole, type SessionPayload } from "@/lib/auth/assertions";
import { TicketStatus } from "@/generated/prisma/enums";

const ALL_STATUSES: TicketStatus[] = [
  "OPEN", "IN_PROGRESS", "WAITING_ON_REQUESTER", "ESCALATED", "RESOLVED", "CLOSED",
];

export async function getDashboardMetrics(session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  const teamId = session.teamId!;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    statusGroups,
    unassignedCount,
    openedLast30,
    closedLast30,
    assigneeGroups,
    ticketsForResponseTime,
  ] = await Promise.all([
    db.ticket.groupBy({
      by: ["status"],
      where: { teamId },
      _count: { status: true },
    }),
    db.ticket.count({
      where: { teamId, assigneeId: null, status: { notIn: ["RESOLVED", "CLOSED"] } },
    }),
    db.ticket.count({ where: { teamId, createdAt: { gte: thirtyDaysAgo } } }),
    db.statusEvent.count({
      where: { ticket: { teamId }, toStatus: "CLOSED", createdAt: { gte: thirtyDaysAgo } },
    }),
    db.ticket.groupBy({
      by: ["assigneeId"],
      where: {
        teamId,
        assigneeId: { not: null },
        status: { notIn: ["RESOLVED", "CLOSED"] },
      },
      _count: { assigneeId: true },
      orderBy: { _count: { assigneeId: "desc" } },
      take: 5,
    }),
    db.ticket.findMany({
      where: { teamId },
      select: {
        createdAt: true,
        comments: {
          where: {
            isInternal: false,
            author: { role: { in: ["SUPPORT", "MANAGER", "ADMIN"] } },
          },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    }),
  ]);

  // Avg first response time in hours
  const responseTimes = ticketsForResponseTime
    .filter(t => t.comments.length > 0)
    .map(t => t.comments[0].createdAt.getTime() - t.createdAt.getTime());
  const avgResponseHours = responseTimes.length
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / (1000 * 60 * 60)
    : null;

  // Status count map (zero-fill missing statuses)
  const statusCounts = Object.fromEntries(ALL_STATUSES.map(s => [s, 0])) as Record<TicketStatus, number>;
  for (const g of statusGroups) statusCounts[g.status] = g._count.status;

  // Fetch names for top assignees
  const assigneeIds = assigneeGroups.map(g => g.assigneeId as string);
  const assignees = assigneeIds.length
    ? await db.user.findMany({
        where:  { id: { in: assigneeIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const byId = Object.fromEntries(assignees.map(u => [u.id, u]));

  return {
    statusCounts,
    unassignedCount,
    openedLast30,
    closedLast30,
    avgResponseHours,
    topAssignees: assigneeGroups.map(g => ({
      user: byId[g.assigneeId as string],
      count: g._count.assigneeId,
    })),
  };
}
