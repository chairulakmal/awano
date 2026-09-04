import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

let client: PrismaClient | undefined;

/**
 * Tests talk to Postgres through the same Prisma schema the application uses, so
 * a schema change breaks the fixtures at compile time instead of at run time.
 * The connection is opened lazily because Playwright loads every test file
 * during collection, and most files never touch the database.
 */
export function db(): PrismaClient {
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  return client;
}

export async function disconnectDb(): Promise<void> {
  await client?.$disconnect();
  client = undefined;
}
