import { test, expect } from "../fixtures";
import { STATE } from "../support/run-context";

/*
 * The queue is one page with four saved filters, a debounced search and a cursor
 * pager. Other tests add tickets to the same team at the same time, so every
 * assertion here names the rows this test created instead of counting the list.
 */

test.describe("Desk queue", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("@smoke the Unassigned view hides tickets that already have an owner", async ({
    deskQueue,
    factory,
    run,
  }) => {
    const free = await factory.ticket({ team: run.alpha, subject: factory.subject("Free") });
    const taken = await factory.ticket({
      team: run.alpha,
      assignee: run.alpha.users.secondSupport,
      subject: factory.subject("Taken"),
    });

    await deskQueue.goto("unassigned");

    await expect(deskQueue.ticket(free.subject)).toBeVisible();
    await expect(deskQueue.ticket(taken.subject)).toBeHidden();
  });

  test("the Mine view shows only what is assigned to the signed-in agent", async ({
    deskQueue,
    factory,
    run,
  }) => {
    const mine = await factory.ticket({
      team: run.alpha,
      assignee: run.alpha.users.support,
      subject: factory.subject("Mine"),
    });
    const theirs = await factory.ticket({
      team: run.alpha,
      assignee: run.alpha.users.secondSupport,
      subject: factory.subject("Theirs"),
    });

    await deskQueue.goto("mine");

    await expect(deskQueue.ticket(mine.subject)).toBeVisible();
    await expect(deskQueue.ticket(theirs.subject)).toBeHidden();
  });

  test("the Open and Escalated views filter by status", async ({ deskQueue, factory, run }) => {
    const open = await factory.ticket({
      team: run.alpha,
      status: "OPEN",
      subject: factory.subject("Still open"),
    });
    const escalated = await factory.ticket({
      team: run.alpha,
      status: "ESCALATED",
      subject: factory.subject("Escalated"),
    });

    await deskQueue.goto("open");
    await expect(deskQueue.ticket(open.subject)).toBeVisible();
    await expect(deskQueue.ticket(escalated.subject)).toBeHidden();

    await deskQueue.selectView("escalated");
    await expect(deskQueue.ticket(escalated.subject)).toBeVisible();
    await expect(deskQueue.ticket(open.subject)).toBeHidden();
  });

  test("@smoke search matches the subject and opening a result loads the ticket", async ({
    deskQueue,
    deskTicket,
    factory,
    run,
  }) => {
    const wanted = await factory.ticket({ team: run.alpha, subject: factory.subject("Wanted") });
    const other = await factory.ticket({ team: run.alpha, subject: factory.subject("Other") });

    await deskQueue.goto();
    await deskQueue.searchFor(wanted.subject);

    await expect(deskQueue.ticket(other.subject)).toBeHidden();
    await deskQueue.open(wanted.subject);

    await expect(deskTicket.heading(wanted.subject)).toBeVisible();
  });

  test("search also matches the body of a ticket", async ({ deskQueue, factory, run }) => {
    const needle = factory.subject("Broken lock in the shared kitchen");
    const ticket = await factory.ticket({
      team: run.alpha,
      subject: factory.subject("Report"),
      body: `The requester wrote: ${needle}`,
    });

    await deskQueue.goto();
    await deskQueue.searchFor(needle);

    await expect(deskQueue.ticket(ticket.subject)).toBeVisible();
  });

  test("a search that matches nothing shows the empty state, and clearing it recovers", async ({
    deskQueue,
    factory,
    run,
  }) => {
    // One row of its own guarantees the queue is not empty for a reason other
    // than the search. Which rows return is left open, because tests run in
    // parallel against this team and the first page holds only ten of them.
    await factory.ticket({ team: run.alpha, subject: factory.subject("Present") });

    await deskQueue.goto();
    await deskQueue.searchFor(factory.subject("no ticket says this"));
    await expect(deskQueue.empty).toBeVisible();

    await deskQueue.clearSearch();

    await expect(deskQueue.empty).toBeHidden();
    expect(await deskQueue.items.count()).toBeGreaterThan(0);
  });

  test("Load more appends the second page of results", async ({ deskQueue, factory, run }) => {
    // The service returns 10 rows per page, so 12 rows force exactly one more page.
    const subject = factory.subject("Paged");
    await factory.tickets(12, { team: run.alpha, subject });

    await deskQueue.goto();
    await deskQueue.searchFor(subject);
    await expect(deskQueue.items).toHaveCount(10);

    await deskQueue.loadMore.click();

    await expect(deskQueue.items).toHaveCount(12);
    await expect(deskQueue.loadMore).toBeHidden();
  });
});
