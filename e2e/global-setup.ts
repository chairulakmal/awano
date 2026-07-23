import "dotenv/config";
import { Pool } from "pg";

export default async function globalSetup() {
  // Strip Prisma-specific ?schema= param; pg doesn't understand it
  const rawUrl = process.env.DATABASE_URL!;
  const connectionString = rawUrl.includes("?") ? rawUrl.split("?")[0] : rawUrl;

  const pool = new Pool({ connectionString });

  try {
    // Look up Dan Support's ID so seed-ticket-a2 can be properly reset
    const { rows } = await pool.query<{ id: string }>(
      `SELECT u.id FROM "User" u
       JOIN "Team" t ON t.id = u."teamId"
       WHERE u.email = $1 AND t.slug = $2`,
      ["support@awano.demo", "demo"]
    );
    const supportId = rows[0]?.id ?? null;

    // Reset seed tickets to their original states
    await pool.query(
      `UPDATE "Ticket"
       SET status = 'OPEN'::"TicketStatus", "assigneeId" = NULL
       WHERE id = 'seed-ticket-a1'`
    );
    await pool.query(
      `UPDATE "Ticket"
       SET status = 'IN_PROGRESS'::"TicketStatus", "assigneeId" = $1
       WHERE id = 'seed-ticket-a2'`,
      [supportId]
    );
    await pool.query(
      `UPDATE "Ticket"
       SET status = 'RESOLVED'::"TicketStatus"
       WHERE id = 'seed-ticket-a3'`
    );

    // Remove comments added by previous test runs
    await pool.query(
      `DELETE FROM "Comment"
       WHERE "ticketId" IN ('seed-ticket-a1', 'seed-ticket-a2', 'seed-ticket-a3')`
    );

    // Remove tickets created by test runs (keep only the 4 seed tickets)
    await pool.query(
      `DELETE FROM "Ticket"
       WHERE id NOT IN ('seed-ticket-a1', 'seed-ticket-a2', 'seed-ticket-a3', 'seed-ticket-b1')`
    );

    // Remove test status events from seed tickets (preserve the original seed event)
    await pool.query(
      `DELETE FROM "StatusEvent"
       WHERE id <> 'seed-event-a1'
         AND "ticketId" IN ('seed-ticket-a1', 'seed-ticket-a2', 'seed-ticket-a3')`
    );
  } finally {
    await pool.end();
  }
}
