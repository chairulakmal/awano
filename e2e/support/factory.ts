import bcrypt from "bcryptjs";
import type { TicketPriority, TicketStatus } from "@/generated/prisma/enums";
import { db } from "./db";
import type { FixtureTeam, FixtureUser, TeamKey } from "./run-context";

/**
 * Every fixture account shares one password, hashed once per run. bcrypt at the
 * application's cost factor takes roughly a quarter of a second per call, which
 * is why the hash is computed once and reused rather than per user.
 */
export const FIXTURE_PASSWORD = "e2e-fixture-password";

export async function hashFixturePassword(): Promise<string> {
  return bcrypt.hash(FIXTURE_PASSWORD, 12);
}

/** Marks rows created by the test suite, so a stale-data sweep can find them. */
export const FIXTURE_TEAM_PREFIX = "e2e";

type NewUser = {
  key: string;
  name: string;
  role: "REQUESTER" | "SUPPORT" | "MANAGER" | "ADMIN";
  requesterType?: "CUSTOMER" | "RECRUITER" | "FIELD_AGENT";
};

const TEAM_MEMBERS: NewUser[] = [
  { key: "requester", name: "Rei Requester", role: "REQUESTER", requesterType: "CUSTOMER" },
  { key: "secondRequester", name: "Sora Second", role: "REQUESTER", requesterType: "RECRUITER" },
  { key: "support", name: "Sato Support", role: "SUPPORT" },
  { key: "secondSupport", name: "Suzu Support", role: "SUPPORT" },
  { key: "manager", name: "Mori Manager", role: "MANAGER" },
  { key: "admin", name: "Aoki Admin", role: "ADMIN" },
];

export const CATEGORY_NAMES = ["Visa & Documentation", "Housing"] as const;

export async function provisionTeam(
  namespace: string,
  key: TeamKey,
  passwordHash: string
): Promise<FixtureTeam> {
  const slug = `${namespace}-${key}`;
  const team = await db().team.create({
    data: {
      slug,
      name: `E2E ${key}`,
      categories: {
        create: CATEGORY_NAMES.map((name, i) => ({ name, slug: `cat-${i}` })),
      },
      users: {
        create: TEAM_MEMBERS.map((member) => ({
          email: `${member.key}@${slug}.test`,
          name: member.name,
          role: member.role,
          requesterType: member.requesterType,
          passwordHash,
        })),
      },
    },
    include: { users: true, categories: { orderBy: { slug: "asc" } } },
  });

  const byKey = (memberKey: string): FixtureUser => {
    const user = team.users.find((u) => u.email.startsWith(`${memberKey}@`));
    if (!user) throw new Error(`Fixture user "${memberKey}" was not created for team ${slug}`);
    return { id: user.id, email: user.email, name: user.name ?? user.email };
  };

  return {
    id: team.id,
    slug,
    categoryIds: team.categories.map((c) => c.id),
    users: {
      requester: byKey("requester"),
      secondRequester: byKey("secondRequester"),
      support: byKey("support"),
      secondSupport: byKey("secondSupport"),
      manager: byKey("manager"),
      admin: byKey("admin"),
    },
  };
}

export async function provisionSuperUser(
  namespace: string,
  passwordHash: string
): Promise<FixtureUser> {
  const user = await db().user.create({
    data: {
      email: `super@${namespace}.test`,
      name: "Sera Super",
      role: "SUPER",
      passwordHash,
    },
  });
  return { id: user.id, email: user.email, name: user.name ?? user.email };
}

/**
 * These accounts exist to be read and edited in the admin table, never to sign
 * in, so they carry a hash that matches no password. bcryptjs answers false for
 * a malformed hash rather than throwing, so a stray sign-in attempt is refused.
 */
const UNUSABLE_PASSWORD_HASH = "$2a$12$e2e.fixture.account.that.can.never.sign.in";

/**
 * A throwaway account for tests that change a user, so no test mutates one of the
 * six accounts the rest of the suite signs in with.
 */
export async function createUser(input: {
  team: FixtureTeam;
  label: string;
  role: "REQUESTER" | "SUPPORT" | "MANAGER" | "ADMIN";
  requesterType?: "CUSTOMER" | "RECRUITER" | "FIELD_AGENT";
  passwordHash?: string;
}): Promise<FixtureUser> {
  const user = await db().user.create({
    data: {
      teamId: input.team.id,
      email: `${input.label}@${input.team.slug}.test`,
      name: input.label,
      role: input.role,
      requesterType: input.requesterType,
      passwordHash: input.passwordHash ?? UNUSABLE_PASSWORD_HASH,
    },
  });
  return { id: user.id, email: user.email, name: user.name ?? user.email };
}

export async function deleteUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db().user.deleteMany({ where: { id: { in: ids } } });
}

export async function deleteCategoriesByName(teamId: string, names: string[]): Promise<void> {
  if (names.length === 0) return;
  await db().category.deleteMany({ where: { teamId, name: { in: names } } });
}

export async function getUserRole(
  id: string
): Promise<{ role: string; requesterType: string | null }> {
  const user = await db().user.findUniqueOrThrow({
    where: { id },
    select: { role: true, requesterType: true },
  });
  return { role: user.role, requesterType: user.requesterType };
}

export type TicketSeed = {
  team: FixtureTeam;
  createdBy?: FixtureUser;
  assignee?: FixtureUser | null;
  subject: string;
  body?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  categoryIndex?: number;
};

export async function createTicket(seed: TicketSeed): Promise<{ id: string; subject: string }> {
  const category = seed.team.categoryIds[seed.categoryIndex ?? 0];
  const ticket = await db().ticket.create({
    data: {
      teamId: seed.team.id,
      createdById: (seed.createdBy ?? seed.team.users.requester).id,
      assigneeId: seed.assignee ? seed.assignee.id : null,
      categoryId: category,
      subject: seed.subject,
      body: seed.body ?? "Created by the end-to-end suite.",
      status: seed.status ?? "OPEN",
      priority: seed.priority ?? "NORMAL",
    },
  });
  return { id: ticket.id, subject: ticket.subject };
}

export async function createComment(input: {
  ticketId: string;
  author: FixtureUser;
  body: string;
  isInternal?: boolean;
}): Promise<{ id: string }> {
  const comment = await db().comment.create({
    data: {
      ticketId: input.ticketId,
      authorId: input.author.id,
      body: input.body,
      isInternal: input.isInternal ?? false,
    },
  });
  return { id: comment.id };
}

export async function deleteTickets(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await db().ticket.deleteMany({ where: { id: { in: ids } } });
}

export async function getTicketStatus(id: string): Promise<TicketStatus> {
  const ticket = await db().ticket.findUniqueOrThrow({
    where: { id },
    select: { status: true },
  });
  return ticket.status;
}

export async function getTicketRow(
  id: string
): Promise<{ status: TicketStatus; priority: TicketPriority; assigneeId: string | null }> {
  return db().ticket.findUniqueOrThrow({
    where: { id },
    select: { status: true, priority: true, assigneeId: true },
  });
}

export async function countStatusEvents(ticketId: string): Promise<number> {
  return db().statusEvent.count({ where: { ticketId } });
}

export async function teamExists(slug: string): Promise<boolean> {
  return (await db().team.count({ where: { slug } })) > 0;
}

export async function dropNamespace(namespace: string): Promise<void> {
  await db().team.deleteMany({ where: { slug: { startsWith: namespace } } });
  await db().user.deleteMany({ where: { email: { endsWith: `@${namespace}.test` } } });
}

/**
 * A run that is killed before teardown leaves its teams behind. The database is
 * shared with local development, so the next run clears anything the suite
 * created and then abandoned.
 */
export async function sweepAbandonedFixtures(maxAgeMs: number): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  const stale = await db().team.findMany({
    where: { slug: { startsWith: FIXTURE_TEAM_PREFIX }, createdAt: { lt: cutoff } },
    select: { slug: true },
  });
  await db().team.deleteMany({
    where: { slug: { in: stale.map((t) => t.slug) } },
  });
  await db().user.deleteMany({
    where: {
      teamId: null,
      role: "SUPER",
      email: { contains: `@${FIXTURE_TEAM_PREFIX}` },
      createdAt: { lt: cutoff },
    },
  });
  return stale.length;
}

export async function createAttachment(input: {
  ticketId: string;
  filename?: string;
}): Promise<{ id: string }> {
  const attachment = await db().attachment.create({
    data: {
      ticketId: input.ticketId,
      filename: input.filename ?? "evidence.png",
      mimeType: "image/png",
      // A one pixel PNG: the smallest payload the download route will serve.
      data: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
        "base64"
      ),
      sizeBytes: 68,
    },
  });
  return { id: attachment.id };
}
