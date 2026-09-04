import { test, expect } from "../fixtures";
import { createAttachment } from "../support/factory";
import { STATE } from "../support/run-context";

/*
 * Awano serves several organisations from one deployment, so a request that
 * crosses a team boundary is a security failure rather than a missing page.
 * The service layer answers with 404 so that an outsider cannot learn whether a
 * given ticket id exists at all.
 */

test.describe("@security cross-team access", () => {
  test.use({ storageState: STATE.bravoSupport });

  test("an agent cannot open another team's ticket", async ({ page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      subject: factory.subject("Alpha only"),
    });

    const response = await page.goto(`/desk/${ticket.id}`);

    expect(response?.status()).toBe(404);
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(ticket.subject)).toBeHidden();
  });

  test("another team's ticket never appears in search results", async ({
    deskQueue,
    factory,
    run,
  }) => {
    const subject = factory.subject("Alpha secret");
    await factory.ticket({ team: run.alpha, subject });

    await deskQueue.goto();
    await deskQueue.searchFor(subject);

    await expect(deskQueue.empty).toBeVisible();
  });

  test("an agent cannot download another team's attachment", async ({ page, factory, run }) => {
    const ticket = await factory.ticket({ team: run.alpha });
    const attachment = await createAttachment({ ticketId: ticket.id });

    const response = await page.request.get(`/api/attachments/${attachment.id}`);

    expect(response.status()).toBe(404);
  });
});

test.describe("@security cross-team access as a requester", () => {
  test.use({ storageState: STATE.bravoRequester });

  test("a requester cannot open another team's ticket", async ({ page, factory, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      subject: factory.subject("Alpha requester only"),
    });

    const response = await page.goto(`/tickets/${ticket.id}`);

    expect(response?.status()).toBe(404);
    await expect(page.getByText(ticket.subject)).toBeHidden();
  });
});

test.describe("@security attachment access inside the team", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("an agent on the owning team can download the attachment", async ({
    page,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha });
    const attachment = await createAttachment({ ticketId: ticket.id });

    const response = await page.request.get(`/api/attachments/${attachment.id}`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/png");
  });
});
