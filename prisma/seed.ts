import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "oretachinomachida";

async function upsertTeam(slug: string, name: string) {
  return db.team.upsert({ where: { slug }, update: {}, create: { slug, name } });
}

async function upsertCategory(teamId: string, slug: string, name: string) {
  return db.category.upsert({
    where: { teamId_slug: { teamId, slug } },
    update: {},
    create: { teamId, slug, name },
  });
}

async function upsertUser(
  teamId: string,
  email: string,
  hash: string,
  role: "REQUESTER" | "SUPPORT" | "MANAGER" | "ADMIN",
  name: string,
  requesterType?: "CUSTOMER" | "RECRUITER" | "FIELD_AGENT"
) {
  return db.user.upsert({
    where: { teamId_email: { teamId, email } },
    update: {},
    create: { teamId, email, passwordHash: hash, role, requesterType, name },
  });
}

async function main() {
  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // -------------------------------------------------------------------------
  // Super user — teamId IS NULL, can't use compound unique key for upsert
  // -------------------------------------------------------------------------
  await db.user.upsert({
    where: { id: "seed-super" },
    update: { email: "super@awano.demo", passwordHash: hash },
    create: {
      id: "seed-super",
      email: "super@awano.demo",
      passwordHash: hash,
      role: "SUPER",
      name: "Super Admin",
    },
  });

  // -------------------------------------------------------------------------
  // Team A — Demo (primary team, matches README credentials)
  // -------------------------------------------------------------------------
  const teamA = await upsertTeam("demo", "Awano Demo");
  const catA = await upsertCategory(teamA.id, "general", "General");

  const customerA = await upsertUser(
    teamA.id,
    "customer@awano.demo",
    hash,
    "REQUESTER",
    "Alice Customer",
    "CUSTOMER"
  );
  await upsertUser(
    teamA.id,
    "recruiter@awano.demo",
    hash,
    "REQUESTER",
    "Bob Recruiter",
    "RECRUITER"
  );
  await upsertUser(teamA.id, "agent@awano.demo", hash, "REQUESTER", "Carol Agent", "FIELD_AGENT");
  const supportA = await upsertUser(teamA.id, "support@awano.demo", hash, "SUPPORT", "Dan Support");
  await upsertUser(teamA.id, "manager@awano.demo", hash, "MANAGER", "Eve Manager");

  const ticketA1 = await db.ticket.upsert({
    where: { id: "seed-ticket-a1" },
    update: {},
    create: {
      id: "seed-ticket-a1",
      teamId: teamA.id,
      createdById: customerA.id,
      categoryId: catA.id,
      subject: "Cannot log in to my account",
      body: "I've been trying to log in for the past hour but keep getting an error.",
      status: "OPEN",
      priority: "HIGH",
    },
  });

  await db.ticket.upsert({
    where: { id: "seed-ticket-a2" },
    update: {},
    create: {
      id: "seed-ticket-a2",
      teamId: teamA.id,
      createdById: customerA.id,
      assigneeId: supportA.id,
      categoryId: catA.id,
      subject: "Need to update billing address",
      body: "Please update my billing address to 123 Main St.",
      status: "IN_PROGRESS",
      priority: "NORMAL",
    },
  });

  await db.ticket.upsert({
    where: { id: "seed-ticket-a3" },
    update: {},
    create: {
      id: "seed-ticket-a3",
      teamId: teamA.id,
      createdById: customerA.id,
      categoryId: catA.id,
      subject: "Feature request: dark mode",
      body: "Would love a dark mode option in the dashboard.",
      status: "RESOLVED",
      priority: "LOW",
    },
  });

  await db.statusEvent.upsert({
    where: { id: "seed-event-a1" },
    update: {},
    create: {
      id: "seed-event-a1",
      ticketId: ticketA1.id,
      actorId: supportA.id,
      toStatus: "OPEN",
      note: "Ticket opened",
    },
  });

  // -------------------------------------------------------------------------
  // Team B — Beta Inc
  // -------------------------------------------------------------------------
  const teamB = await upsertTeam("beta", "Beta Inc");
  const catB = await upsertCategory(teamB.id, "support", "Support");

  const customerB = await upsertUser(
    teamB.id,
    "customer@beta.demo",
    hash,
    "REQUESTER",
    "Frank Customer",
    "CUSTOMER"
  );
  const supportB = await upsertUser(
    teamB.id,
    "support@beta.demo",
    hash,
    "SUPPORT",
    "Grace Support"
  );
  await upsertUser(teamB.id, "manager@beta.demo", hash, "MANAGER", "Hank Manager");

  await db.ticket.upsert({
    where: { id: "seed-ticket-b1" },
    update: {},
    create: {
      id: "seed-ticket-b1",
      teamId: teamB.id,
      createdById: customerB.id,
      assigneeId: supportB.id,
      categoryId: catB.id,
      subject: "Integration not working",
      body: "The API integration stopped working after the last update.",
      status: "IN_PROGRESS",
      priority: "URGENT",
    },
  });

  console.log("✓ Seeded: 1 super, 2 teams, 9 users, 4 tickets");
  console.log(`  Password for all accounts: ${DEMO_PASSWORD}`);
  console.log("  Team demo: customer@awano.demo | support@awano.demo | manager@awano.demo");
  console.log("  Team beta: customer@beta.demo  | support@beta.demo  | manager@beta.demo");
  console.log("  Super: super@awano.demo (no team slug needed)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
