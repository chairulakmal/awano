import { test, expect } from "../fixtures";
import { createComment, CATEGORY_NAMES } from "../support/factory";
import { STATE } from "../support/run-context";

/*
 * The requester portal is the only place where a ticket is created through the
 * interface, so this file drives the real form rather than the factory. It also
 * covers the one place where the two sides of the product disagree on wording:
 * WAITING_ON_REQUESTER reads as "Waiting on you" to the requester.
 */

test.describe("Requester portal", () => {
  test.use({ storageState: STATE.alphaRequester });

  test("@smoke a requester files a ticket and lands on it", async ({ portal, page, factory }) => {
    const subject = factory.subject("Renewing my residence card");

    await portal.gotoNew();
    const id = await portal.createTicket(
      subject,
      "The card expires next month.",
      CATEGORY_NAMES[0]
    );
    factory.track(id);

    await expect(page.getByRole("heading", { name: subject, level: 1 })).toBeVisible();

    await portal.gotoList();
    await expect(portal.ticket(subject)).toBeVisible();
  });

  test("the form refuses to submit while a required field is empty", async ({ portal, page }) => {
    await portal.gotoNew();
    await portal.subject.fill("Subject without a category or details");
    await portal.submit.click();

    await expect(page).toHaveURL(/\/tickets\/new$/);
    await expect(portal.category).toHaveJSProperty("validity.valid", false);
  });

  test("a requester replies on their own ticket", async ({ portal, page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      status: "IN_PROGRESS",
    });
    const reply = `Thank you, I sent the document ${ticket.id}`;

    await portal.gotoTicket(ticket.id);
    await portal.reply.fill(reply);
    await portal.sendReply.click();

    await expect(page.getByText(reply)).toBeVisible();
  });

  test("an agent reply is delivered to the requester", async ({ portal, page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      status: "IN_PROGRESS",
    });
    const answer = `We booked your appointment ${ticket.id}`;
    await createComment({ ticketId: ticket.id, author: run.alpha.users.support, body: answer });

    await portal.gotoTicket(ticket.id);

    await expect(page.getByText(answer)).toBeVisible();
  });

  test("a ticket waiting on the requester says so in their own words", async ({
    portal,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      status: "WAITING_ON_REQUESTER",
      subject: factory.subject("Needs my answer"),
    });

    await portal.gotoList();

    // The desk calls this status "Waiting on requester"; the portal addresses
    // the requester directly.
    await expect(portal.ticket(ticket.subject)).toContainText("Waiting on you");
  });

  test("a closed ticket offers no reply box", async ({ portal, page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      createdBy: run.alpha.users.requester,
      status: "CLOSED",
    });

    await portal.gotoTicket(ticket.id);

    await expect(page.getByText("This ticket is closed.")).toBeVisible();
    await expect(portal.reply).toBeHidden();
  });
});
