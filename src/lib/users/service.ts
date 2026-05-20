import { db } from "@/lib/db";
import { assertRole, type SessionPayload } from "@/lib/auth/assertions";

export async function listTeamMembers(session: SessionPayload) {
  assertRole(session, ["SUPPORT", "MANAGER", "ADMIN"]);
  return db.user.findMany({
    where: {
      teamId: session.teamId!,
      role:   { notIn: ["REQUESTER", "SUPER"] },
    },
    select:  { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}
