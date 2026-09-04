import { test, expect } from "../fixtures";
import { createComment } from "../support/factory";
import { STATE } from "../support/run-context";

test.describe("@security a requester sees only their own tickets", () => {
  test.use({ storageState: STATE.alphaRequester });

  test("a colleague's ticket is absent from the list", async ({ portal, factory, run }) => {
    const mine = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      subject: factory.subject("Mine"),
    });
    const theirs = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.secondRequester,
      subject: factory.subject("Theirs"),
    });

    await portal.gotoList();

    await expect(portal.ticket(mine.subject)).toBeVisible();
    await expect(portal.ticket(theirs.subject)).toBeHidden();
  });

  test("opening a colleague's ticket by id answers 404", async ({ page, factory, run }) => {
    const theirs = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.secondRequester,
      subject: factory.subject("Not yours"),
    });

    const response = await page.goto(`/tickets/${theirs.id}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText(theirs.subject)).toBeHidden();
  });

  test("an internal note is never delivered to the requester", async ({ page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      status: "IN_PROGRESS",
    });
    const note = `Do not show this to the requester ${ticket.id}`;
    const reply = `Visible reply ${ticket.id}`;

    await createComment({
      ticketId: ticket.id,
      author: run.alpha.users.support,
      body: note,
      isInternal: true,
    });
    await createComment({
      ticketId: ticket.id,
      author: run.alpha.users.support,
      body: reply,
    });

    await page.goto(`/tickets/${ticket.id}`);

    await expect(page.getByText(reply)).toBeVisible();
    // The note must be filtered out of the query, not merely hidden by styling,
    // so the assertion reads the delivered markup instead of the layout.
    expect(await page.content()).not.toContain(note);
  });
});

test.describe("@security internal notes in the agent view", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("an agent writes an internal note and sees it marked as internal", async ({
    deskTicket,
    page,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "IN_PROGRESS" });
    const note = `Internal only ${ticket.id}`;

    await deskTicket.goto(ticket.id);
    await deskTicket.postComment(note, { internal: true });

    await expect(page.getByText("Internal", { exact: true })).toBeVisible();
  });
});
