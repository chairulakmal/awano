import { test as base, expect } from "@playwright/test";
import { AdminPage } from "./pages/admin.page";
import { DeskQueuePage } from "./pages/desk-queue.page";
import { DeskTicketPage } from "./pages/desk-ticket.page";
import { LoginPage } from "./pages/login.page";
import { PortalPage } from "./pages/portal.page";
import { disconnectDb } from "./support/db";
import {
  createTicket,
  createUser,
  deleteCategoriesByName,
  deleteTickets,
  deleteUsers,
  type TicketSeed,
} from "./support/factory";
import {
  readRunContext,
  type FixtureTeam,
  type FixtureUser,
  type RunContext,
} from "./support/run-context";

type Ticket = { id: string; subject: string };

/**
 * Creates rows that belong to one test and removes them afterwards. Tests run in
 * parallel against one database, so every test owns its data and asserts on that
 * data by name; no test may assume the total contents of a list.
 */
export type Factory = {
  ticket(seed: Omit<TicketSeed, "subject"> & { subject?: string }): Promise<Ticket>;
  tickets(
    count: number,
    seed: Omit<TicketSeed, "subject"> & { subject?: string }
  ): Promise<Ticket[]>;
  /** A subject no other test can produce, safe to search for and assert on. */
  subject(label: string): string;
  /** A throwaway account, so no test changes one the suite signs in with. */
  user(input: {
    team: FixtureTeam;
    label: string;
    role: "REQUESTER" | "SUPPORT" | "MANAGER" | "ADMIN";
    requesterType?: "CUSTOMER" | "RECRUITER" | "FIELD_AGENT";
  }): Promise<FixtureUser>;
  /** Registers a row the test created through the interface for the same cleanup. */
  track(ticketId: string): void;
  /** Registers a category created through the interface for the same cleanup. */
  trackCategory(team: FixtureTeam, name: string): void;
};

type WorkerFixtures = {
  run: RunContext;
};

type TestFixtures = {
  factory: Factory;
  loginPage: LoginPage;
  deskQueue: DeskQueuePage;
  deskTicket: DeskTicketPage;
  portal: PortalPage;
  admin: AdminPage;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  run: [
    async ({}, use) => {
      await use(readRunContext());
      await disconnectDb();
    },
    { scope: "worker" },
  ],

  factory: async ({}, use, testInfo) => {
    const created: string[] = [];
    const createdUsers: string[] = [];
    const createdCategories: { teamId: string; name: string }[] = [];
    let counter = 0;

    const subject = (label: string) =>
      `${label} ${testInfo.testId}-${(counter += 1).toString().padStart(2, "0")}`;

    async function ticket(seed: Omit<TicketSeed, "subject"> & { subject?: string }) {
      const row = await createTicket({ ...seed, subject: seed.subject ?? subject("Ticket") });
      created.push(row.id);
      return row;
    }

    await use({
      subject,
      ticket,
      track: (ticketId: string) => created.push(ticketId),
      trackCategory: (team, name) => createdCategories.push({ teamId: team.id, name }),
      async user(input) {
        const row = await createUser({ ...input, label: `${input.label}-${testInfo.testId}` });
        createdUsers.push(row.id);
        return row;
      },
      async tickets(count, seed) {
        const rows: Ticket[] = [];
        for (let i = 0; i < count; i += 1) rows.push(await ticket(seed));
        return rows;
      },
    });

    await deleteTickets(created);
    await deleteUsers(createdUsers);
    for (const { teamId, name } of createdCategories) {
      await deleteCategoriesByName(teamId, [name]);
    }
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  deskQueue: async ({ page }, use) => use(new DeskQueuePage(page)),
  deskTicket: async ({ page }, use) => use(new DeskTicketPage(page)),
  portal: async ({ page }, use) => use(new PortalPage(page)),
  admin: async ({ page }, use) => use(new AdminPage(page)),
});

export { expect };
