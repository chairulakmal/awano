import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  assertRole,
  assertSameTeam,
  AuthorizationError,
  type SessionPayload,
} from "@/lib/auth/assertions";
import type { Role, RequesterType } from "@/generated/prisma/enums";

const ASSIGNABLE_ROLES: Role[] = ["REQUESTER", "SUPPORT", "MANAGER", "ADMIN"];

const ROLE_RANK: Record<Role, number> = {
  REQUESTER: 0,
  SUPPORT: 1,
  MANAGER: 2,
  ADMIN: 3,
  SUPER: 4,
};

// Maximum rank a given role may assign to others.
// MANAGER → up to SUPPORT (1); ADMIN → up to MANAGER (2).
const ASSIGNABLE_CEILING: Record<Role, number> = {
  REQUESTER: -1,
  SUPPORT: -1,
  MANAGER: 1,
  ADMIN: 2,
  SUPER: 3,
};

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

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
  session: SessionPayload
) {
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { passwordHash: true },
  });
  if (!user?.passwordHash) throw new AuthorizationError("Invalid credentials");
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AuthorizationError("Invalid credentials");
  const hash = await bcrypt.hash(newPassword, 12);
  await db.user.update({ where: { id: session.userId }, data: { passwordHash: hash } });
}

export async function changeUserRole(
  userId: string,
  newRole: Role,
  newRequesterType: RequesterType | null,
  session: SessionPayload
) {
  assertRole(session, ["MANAGER", "ADMIN"]);
  if (!ASSIGNABLE_ROLES.includes(newRole)) throw new AuthorizationError("Cannot assign this role");
  if (ROLE_RANK[newRole] > ASSIGNABLE_CEILING[session.role])
    throw new AuthorizationError("Cannot assign a role higher than your own");
  if (userId === session.userId) throw new AuthorizationError("Cannot change your own role");

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { teamId: true, role: true, requesterType: true },
  });
  if (!user || !user.teamId) throw new AuthorizationError("User not found");
  assertSameTeam(session, { teamId: user.teamId });

  if (ROLE_RANK[user.role] > ASSIGNABLE_CEILING[session.role])
    throw new AuthorizationError("Cannot modify a user with a higher role");

  if (newRole === "SUPPORT" && user.role === "REQUESTER" && user.requesterType !== "FIELD_AGENT")
    throw new AuthorizationError("Only field agents can be promoted to Support");

  return db.user.update({
    where: { id: userId },
    data: {
      role: newRole,
      requesterType: newRole === "REQUESTER" ? (newRequesterType ?? user.requesterType ?? "CUSTOMER") : null,
    },
  });
}
