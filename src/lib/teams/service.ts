import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertRole, type SessionPayload } from "@/lib/auth/assertions";
import type { Role, RequesterType } from "@/generated/prisma/enums";

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  notes: z.string().max(500).optional(),
});

const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["REQUESTER", "SUPPORT", "MANAGER", "ADMIN"]),
  requesterType: z.enum(["CUSTOMER", "RECRUITER", "FIELD_AGENT"]).optional(),
});

export async function listTeams(session: SessionPayload) {
  assertRole(session, ["SUPER"]);
  return db.team.findMany({
    include: { _count: { select: { users: true, tickets: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createTeam(input: unknown, session: SessionPayload) {
  assertRole(session, ["SUPER"]);
  const parsed = createTeamSchema.parse(input);

  try {
    return await db.team.create({
      data: { name: parsed.name, slug: parsed.slug, notes: parsed.notes },
    });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) throw new Error("A team with this slug already exists");
    throw err;
  }
}

export async function getTeamDetail(teamId: string, session: SessionPayload) {
  assertRole(session, ["SUPER"]);
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          requesterType: true,
          createdAt: true,
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
      _count: { select: { tickets: true } },
    },
  });
  if (!team) throw new Error("Team not found");
  return team;
}

export async function createUserInTeam(
  teamId: string,
  input: unknown,
  session: SessionPayload,
) {
  assertRole(session, ["SUPER"]);
  const parsed = createUserSchema.parse(input);
  const { name, email, password, role, requesterType } = parsed;
  const passwordHash = await bcrypt.hash(password, 12);
  const effectiveRequesterType =
    role === "REQUESTER" ? (requesterType ?? "CUSTOMER") : null;

  try {
    return await db.user.create({
      data: { teamId, name, email, passwordHash, role, requesterType: effectiveRequesterType },
    });
  } catch (err: unknown) {
    if (isPrismaUniqueError(err)) {
      throw new Error("A user with this email already exists in this team");
    }
    throw err;
  }
}

const DEMO_PASSWORD = "oretachinomachida";

export async function seedDemoUsers(teamId: string, session: SessionPayload) {
  assertRole(session, ["SUPER"]);
  const team = await db.team.findUnique({ where: { id: teamId }, select: { slug: true } });
  if (!team) throw new Error("Team not found");

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const { slug } = team;

  const demoUsers: Array<{
    email: string;
    name: string;
    role: Role;
    requesterType: RequesterType | null;
  }> = [
    { email: `customer@${slug}.demo`, name: "Demo Customer",  role: "REQUESTER", requesterType: "CUSTOMER" },
    { email: `recruiter@${slug}.demo`, name: "Demo Recruiter", role: "REQUESTER", requesterType: "RECRUITER" },
    { email: `agent@${slug}.demo`,    name: "Demo Agent",     role: "REQUESTER", requesterType: "FIELD_AGENT" },
    { email: `support@${slug}.demo`,  name: "Demo Support",   role: "SUPPORT",   requesterType: null },
    { email: `manager@${slug}.demo`,  name: "Demo Manager",   role: "MANAGER",   requesterType: null },
  ];

  let created = 0;
  for (const user of demoUsers) {
    try {
      await db.user.create({ data: { teamId, ...user, passwordHash: hash } });
      created++;
    } catch {
      // Skip users that already exist (P2002)
    }
  }

  return { created, total: demoUsers.length };
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: string }).code === "P2002"
  );
}
