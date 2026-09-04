import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { STATE } from "../support/run-context";

/*
 * The layout switches at Tailwind's sm breakpoint, 640 pixels. Each test sets
 * the viewport itself instead of relying on the project's device, so the same
 * file proves both sides of the breakpoint on desktop Chrome and on Pixel 7.
 */

const PHONE = { width: 390, height: 844 };
const LAPTOP = { width: 1280, height: 800 };

/** True when the page fits its own viewport, which is what users feel as no sideways scrolling. */
async function fitsHorizontally(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}

test.describe("@responsive navigation", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("a narrow screen replaces the inline links with a menu", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/desk");

    const menuButton = page.getByRole("button", { name: "Navigation menu" });
    await expect(menuButton).toBeVisible();
    await expect(page.getByRole("link", { name: "Queue" })).toBeHidden();

    await menuButton.click();

    await expect(page.getByRole("link", { name: "Queue" })).toBeVisible();
  });

  test("a wide screen shows the links and hides the menu button", async ({ page }) => {
    await page.setViewportSize(LAPTOP);
    await page.goto("/desk");

    await expect(page.getByRole("link", { name: "Queue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Navigation menu" })).toBeHidden();
  });

  test("the menu closes after it is used", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/desk");

    await page.getByRole("button", { name: "Navigation menu" }).click();
    await page.getByRole("link", { name: "Queue" }).click();

    await expect(page).toHaveURL(/\/desk$/);
    await expect(page.getByRole("link", { name: "Queue" })).toBeHidden();
  });
});

test.describe("@responsive layout", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("the queue filters stay reachable on a phone", async ({ deskQueue, page }) => {
    await page.setViewportSize(PHONE);
    await deskQueue.goto();

    // The group headings are for the two column layout only; the filters themselves
    // stay on screen as a scrolling row.
    await expect(page.getByText("Team queue")).toBeHidden();
    await expect(page.getByRole("link", { name: "Escalated", exact: true })).toBeVisible();
  });

  test("a ticket fits the width of a phone", async ({ deskTicket, factory, page, run }) => {
    const ticket = await factory.ticket({
      team: run.alpha,
      subject: factory.subject("A subject long enough to test how the header wraps on a phone"),
    });

    await page.setViewportSize(PHONE);
    await deskTicket.goto(ticket.id);
    await expect(deskTicket.statusBadge).toBeVisible();

    expect(await fitsHorizontally(page)).toBe(true);
  });
});

test.describe("@responsive the requester portal", () => {
  test.use({ storageState: STATE.alphaRequester });

  test("the new ticket form fits the width of a phone", async ({ portal, page }) => {
    await page.setViewportSize(PHONE);
    await portal.gotoNew();

    await expect(portal.submit).toBeVisible();
    expect(await fitsHorizontally(page)).toBe(true);
  });
});
