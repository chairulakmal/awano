import { test, expect } from "../fixtures";
import { countStatusEvents, getTicketStatus } from "../support/factory";
import { STATE } from "../support/run-context";

/*
 * Status changes are defined by the finite state machine in src/lib/tickets/fsm.ts.
 * Each move has a minimum role, and each accepted move writes one audit row in
 * the same database transaction as the ticket update.
 */

test.describe("Ticket workflow as an agent", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("an agent moves a ticket from Open to Closed", async ({ deskTicket, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "OPEN" });

    await deskTicket.goto(ticket.id);
    await deskTicket.expectStatus("OPEN");

    await deskTicket.moveTo("IN_PROGRESS");
    await deskTicket.moveTo("WAITING_ON_REQUESTER");
    await deskTicket.moveTo("IN_PROGRESS");
    await deskTicket.moveTo("RESOLVED");
    await deskTicket.moveTo("CLOSED");

    await deskTicket.expectStatus("CLOSED");
    expect(await getTicketStatus(ticket.id)).toBe("CLOSED");
    expect(await countStatusEvents(ticket.id)).toBe(5);
  });

  test("an agent is not offered the moves that need a manager", async ({
    deskTicket,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "IN_PROGRESS" });

    await deskTicket.goto(ticket.id);

    await expect(deskTicket.transition("WAITING_ON_REQUESTER")).toBeVisible();
    await expect(deskTicket.transition("RESOLVED")).toBeVisible();
    await expect(deskTicket.transition("ESCALATED")).toBeHidden();
  });

  test("an agent cannot reopen a closed ticket", async ({ deskTicket, page, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "CLOSED" });

    await deskTicket.goto(ticket.id);

    await expect(page.getByText("No transitions available")).toBeVisible();
    await expect(deskTicket.transition("OPEN")).toBeHidden();
  });

  test("a closed ticket accepts no further replies", async ({ deskTicket, page, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "CLOSED" });

    await deskTicket.goto(ticket.id);

    await expect(page.getByText("This ticket is closed.")).toBeVisible();
    await expect(deskTicket.replyBody).toBeHidden();
  });

  test("every accepted move is recorded in the timeline", async ({
    deskTicket,
    page,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "OPEN" });

    await deskTicket.goto(ticket.id);
    await deskTicket.moveTo("IN_PROGRESS");
    await page.reload();

    await expect(page.getByText("Open → In progress")).toBeVisible();
  });
});

test.describe("Ticket workflow as a manager", () => {
  test.use({ storageState: STATE.alphaManager });

  test("a manager escalates and then takes the ticket back", async ({
    deskTicket,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "IN_PROGRESS" });

    await deskTicket.goto(ticket.id);
    await deskTicket.moveTo("ESCALATED");
    await deskTicket.expectStatus("ESCALATED");

    // Escalated has exactly one way out, and it needs a manager.
    await expect(deskTicket.transition("RESOLVED")).toBeHidden();
    await deskTicket.moveTo("IN_PROGRESS");

    expect(await getTicketStatus(ticket.id)).toBe("IN_PROGRESS");
  });

  test("a manager reopens a closed ticket", async ({ deskTicket, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "CLOSED" });

    await deskTicket.goto(ticket.id);
    await deskTicket.moveTo("OPEN");

    await deskTicket.expectStatus("OPEN");
    expect(await getTicketStatus(ticket.id)).toBe("OPEN");
  });
});
