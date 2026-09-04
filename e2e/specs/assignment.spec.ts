import { test, expect } from "../fixtures";
import { getTicketRow } from "../support/factory";
import { STATE } from "../support/run-context";

/*
 * Two rules meet on this screen. The dropdown only offers what the signed-in
 * role may choose, and src/lib/tickets/service.ts refuses an assignment to
 * anyone but yourself below MANAGER. Both are checked here, and the result is
 * read back from the database because the form gives no success message.
 */

/** The form has no success toast, so the row is polled until the server commits. */
function assigneeOf(ticketId: string) {
  return async () => (await getTicketRow(ticketId)).assigneeId;
}

test.describe("Assignment as an agent", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("an agent is offered only their own name", async ({ deskTicket, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha });

    await deskTicket.goto(ticket.id);

    await expect(deskTicket.assigneeOptions).toHaveText([
      "Unassigned",
      run.alpha.users.support.name,
    ]);
  });

  test("an agent takes a ticket for themselves", async ({ deskTicket, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha });

    await deskTicket.goto(ticket.id);
    await deskTicket.assignTo(run.alpha.users.support.name);

    await expect.poll(assigneeOf(ticket.id)).toBe(run.alpha.users.support.id);
  });
});

test.describe("Assignment as a manager", () => {
  test.use({ storageState: STATE.alphaManager });

  test("a manager is offered every agent on the team", async ({ deskTicket, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha });

    await deskTicket.goto(ticket.id);

    // listTeamMembers excludes requesters and super users, leaving four agents.
    await expect(deskTicket.assigneeOptions).toHaveText([
      "Unassigned",
      run.alpha.users.admin.name,
      run.alpha.users.manager.name,
      run.alpha.users.support.name,
      run.alpha.users.secondSupport.name,
    ]);
  });

  test("a manager hands a ticket to an agent, who then finds it in Mine", async ({
    browser,
    deskTicket,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      subject: factory.subject("Handed over"),
    });

    await deskTicket.goto(ticket.id);
    await deskTicket.assignTo(run.alpha.users.support.name);
    await expect.poll(assigneeOf(ticket.id)).toBe(run.alpha.users.support.id);

    const agentContext = await browser.newContext({ storageState: STATE.alphaSupport });
    const agentPage = await agentContext.newPage();
    await agentPage.goto("/desk?view=mine");

    await expect(agentPage.getByRole("link", { name: new RegExp(ticket.subject) })).toBeVisible();
    await agentContext.close();
  });

  test("a manager releases a ticket back to the unassigned queue", async ({
    deskQueue,
    deskTicket,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      assignee: run.alpha.users.support,
      subject: factory.subject("Released"),
    });

    await deskTicket.goto(ticket.id);
    await deskTicket.assignTo("Unassigned");
    await expect.poll(assigneeOf(ticket.id)).toBeNull();

    await deskQueue.goto("unassigned");
    await deskQueue.searchFor(ticket.subject);

    await expect(deskQueue.ticket(ticket.subject)).toBeVisible();
  });

  test("a priority change survives a reload", async ({ deskTicket, page, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha, priority: "NORMAL" });

    await deskTicket.goto(ticket.id);
    await deskTicket.setPriority("Urgent");
    await expect.poll(async () => (await getTicketRow(ticket.id)).priority).toBe("URGENT");

    await page.reload();

    await expect(deskTicket.prioritySelect).toHaveValue("URGENT");
  });
});
