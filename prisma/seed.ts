import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { seedTickets } from "./tickets";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const DEMO_PASSWORD = "oretachinomachida";

async function upsertTeam(slug: string, name: string) {
  return db.team.upsert({ where: { slug }, update: {}, create: { slug, name } });
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

  const customerA = await upsertUser(teamA.id, "customer@awano.demo", hash, "REQUESTER", "Alice Customer", "CUSTOMER");
  const recruiterA = await upsertUser(teamA.id, "recruiter@awano.demo", hash, "REQUESTER", "Bob Recruiter", "RECRUITER");
  const agentA = await upsertUser(teamA.id, "agent@awano.demo", hash, "REQUESTER", "Carol Agent", "FIELD_AGENT");
  const supportA = await upsertUser(teamA.id, "support@awano.demo", hash, "SUPPORT", "Dan Support");
  const managerA = await upsertUser(teamA.id, "manager@awano.demo", hash, "MANAGER", "Eve Manager");

  // -------------------------------------------------------------------------
  // Team B — Beta Inc
  // -------------------------------------------------------------------------
  const teamB = await upsertTeam("beta", "Beta Inc");

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
  const managerB = await upsertUser(teamB.id, "manager@beta.demo", hash, "MANAGER", "Hank Manager");

  // -------------------------------------------------------------------------
  // Tickets — see prisma/tickets.ts for the full test scenario breakdown
  // -------------------------------------------------------------------------
  await seedTickets(db, {
    teamAId: teamA.id,
    teamBId: teamB.id,
    hash,
    supportAId: supportA.id,
    managerAId: managerA.id,
    supportBId: supportB.id,
    managerBId: managerB.id,
    customerAId: customerA.id,
    recruiterAId: recruiterA.id,
    agentAId: agentA.id,
    customerBId: customerB.id,
  });

  console.log("✓ Seeded: 1 super, 2 teams, users, 18 tickets (tokutei ginou scenarios)");
  console.log(`  Password for all accounts: ${DEMO_PASSWORD}`);
  console.log("  Team demo: rahmat@awano.demo | nguyen@awano.demo | support@awano.demo | manager@awano.demo");
  console.log("  Team beta: kyaw@beta.demo | lan@beta.demo | mahtwe@beta.demo | support@beta.demo");
  console.log("  Super: super@awano.demo (no team slug needed)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
