import { db } from "@/lib/db";
import {
  assertRole,
  assertSameTeam,
  AuthorizationError,
  type SessionPayload,
} from "@/lib/auth/assertions";
import type { Role } from "@/generated/prisma/enums";

const ASSIGNABLE_ROLES: Role[] = ["REQUESTER", "SUPPORT", "MANAGER", "ADMIN"];

export async function listTeamMembers(session: SessionPayload) {
  assertRole(session, ["SUPPORT", "MANAGER", "ADMIN"]);
  return db.user.findMany({
    where: {
      teamId: session.teamId!,
      role: { notIn: ["REQUESTER", "SUPER"] },
    },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}

export async function listTeamUsers(session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  return db.user.findMany({
    where: { teamId: session.teamId! },
    select: { id: true, name: true, email: true, role: true, requesterType: true, createdAt: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
}

export async function changeUserRole(userId: string, newRole: Role, session: SessionPayload) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  if (!ASSIGNABLE_ROLES.includes(newRole)) throw new AuthorizationError("Cannot assign this role");
  if (userId === session.userId) throw new AuthorizationError("Cannot change your own role");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { teamId: true, role: true, requesterType: true },
  });
  if (!user || !user.teamId) throw new AuthorizationError("User not found");
  assertSameTeam(session, { teamId: user.teamId });

  return db.user.update({
    where: { id: userId },
    data: {
      role: newRole,
      requesterType: newRole === "REQUESTER" ? (user.requesterType ?? "CUSTOMER") : null,
    },
  });
}
