/**
 * Bulk ticket seed for pagination testing.
 * Creates 60 minimal tickets on Team A (demo) spread across all statuses and priorities.
 * Safe to re-run — uses upsert with stable IDs.
 */

import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import type { TicketStatus, TicketPriority } from "../src/generated/prisma/enums";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

const STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_ON_REQUESTER",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];

const PRIORITIES: TicketPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

const SUBJECTS = [
  "Residence card renewal taking longer than expected",
  "Contract clause on overtime not explained clearly",
  "Health insurance card not received after enrollment",
  "Assigned dormitory has mold issues",
  "Skills test registration portal keeps timing out",
  "Change of employer — what documents are required?",
  "Pension withdrawal process after leaving Japan",
  "Airport pickup never arrived on arrival day",
  "Translation of employment contract requested",
  "Working hours exceed agreed contract terms",
];

async function main() {
  // Look up Team A by slug
  const teamA = await db.team.findUniqueOrThrow({ where: { slug: "demo" } });

  // Look up existing users on Team A
  const [customer, recruiter, agent, support, manager] = await Promise.all([
    db.user.findFirstOrThrow({ where: { teamId: teamA.id, email: "customer@awano.demo" } }),
    db.user.findFirstOrThrow({ where: { teamId: teamA.id, email: "recruiter@awano.demo" } }),
    db.user.findFirstOrThrow({ where: { teamId: teamA.id, email: "agent@awano.demo" } }),
    db.user.findFirstOrThrow({ where: { teamId: teamA.id, email: "support@awano.demo" } }),
    db.user.findFirstOrThrow({ where: { teamId: teamA.id, email: "manager@awano.demo" } }),
  ]);

  // Ensure a bulk-seed category exists
  const category = await db.category.upsert({
    where: { teamId_slug: { teamId: teamA.id, slug: "bulk-seed" } },
    update: {},
    create: { teamId: teamA.id, slug: "bulk-seed", name: "Bulk Seed" },
  });

  const requesters = [customer, recruiter, agent];
  const assignees = [support, manager, null];

  const COUNT = 60;
  const ops = Array.from({ length: COUNT }, (_, i) => {
    const status = STATUSES[i % STATUSES.length];
    const priority = PRIORITIES[i % PRIORITIES.length];
    const requester = requesters[i % requesters.length];
    const assignee = assignees[i % assignees.length];
    const subject = `[Bulk #${String(i + 1).padStart(2, "0")}] ${SUBJECTS[i % SUBJECTS.length]}`;
    const id = `bulk-ticket-${String(i + 1).padStart(3, "0")}`;

    return db.ticket.upsert({
      where: { id },
      update: {},
      create: {
        id,
        teamId: teamA.id,
        createdById: requester.id,
        categoryId: category.id,
        subject,
        body: "Seeded for pagination testing.",
        status,
        priority,
        assigneeId: assignee?.id ?? null,
      },
    });
  });

  await Promise.all(ops);
  console.log(`✓ Upserted ${COUNT} bulk tickets on team "demo" (slug: bulk-seed)`);
  console.log("  Re-run safely — all IDs are stable.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
