import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures";
import { STATE } from "../support/run-context";

/*
 * An automated scan finds roughly a third of accessibility defects, so a clean
 * result here is a floor and not a certificate. The scan is limited to the WCAG
 * 2.1 A and AA rules, which is the level the product claims to meet, and it runs
 * on both the desktop and the mobile project because the layout differs.
 */

const STANDARD = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/**
 * Rules the product fails today. They are excluded from the page scans so that
 * those scans still catch a new defect, and the last block in this file asserts
 * each one still fails, so an exclusion cannot outlive the defect that earned
 * it. docs/TESTING.md § Known defects describes both.
 */
const KNOWN_DEFECTS = ["color-contrast", "link-in-text-block"];

async function violationsOn(page: Page, options: { includeKnownDefects?: boolean } = {}) {
  const builder = new AxeBuilder({ page }).withTags(STANDARD);
  if (!options.includeKnownDefects) builder.disableRules(KNOWN_DEFECTS);
  const { violations } = await builder.analyze();
  // The rule id and the failing selector are what a developer needs to act, so
  // the message carries them instead of only a count.
  return violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    nodes: v.nodes.map((n) => n.target.join(" ")),
  }));
}

const scan = (page: Page) => violationsOn(page);

async function ruleIdsOn(page: Page): Promise<string[]> {
  const violations = await violationsOn(page, { includeKnownDefects: true });
  return violations.map((v) => v.id);
}

test.describe("@a11y public pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the landing page has no automatically detectable violations", async ({ page }) => {
    await page.goto("/");
    expect(await scan(page)).toEqual([]);
  });

  test("the sign-in form has no automatically detectable violations", async ({
    loginPage,
    page,
    run,
  }) => {
    await loginPage.gotoTeam(run.alpha.slug);
    await expect(loginPage.submit).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });
});

test.describe("@a11y the agent workspace", () => {
  test.use({ storageState: STATE.alphaSupport });

  test("the queue has no automatically detectable violations", async ({ deskQueue, page }) => {
    await deskQueue.goto();
    expect(await scan(page)).toEqual([]);
  });

  test("a ticket has no automatically detectable violations", async ({
    deskTicket,
    page,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha, status: "IN_PROGRESS" });

    await deskTicket.goto(ticket.id);
    await expect(deskTicket.statusBadge).toBeVisible();

    expect(await scan(page)).toEqual([]);
  });
});

test.describe("@a11y the requester portal", () => {
  test.use({ storageState: STATE.alphaRequester });

  test("the ticket list has no automatically detectable violations", async ({ portal, page }) => {
    await portal.gotoList();
    expect(await scan(page)).toEqual([]);
  });

  test("the new ticket form has no automatically detectable violations", async ({
    portal,
    page,
  }) => {
    await portal.gotoNew();
    expect(await scan(page)).toEqual([]);
  });
});

test.describe("@a11y the admin area", () => {
  test.use({ storageState: STATE.alphaAdmin });

  test("the dashboard has no automatically detectable violations", async ({ admin, page }) => {
    await admin.gotoDashboard();
    expect(await scan(page)).toEqual([]);
  });

  test("the user table has no automatically detectable violations", async ({ admin, page }) => {
    await admin.gotoUsers();
    expect(await scan(page)).toEqual([]);
  });
});

/*
 * These two tests fail on the day the defects are fixed. That failure is the
 * signal to delete the rule from KNOWN_DEFECTS, which restores the rule across
 * every scan above.
 */
test.describe("@a11y known defects", () => {
  test.use({ storageState: STATE.alphaAdmin });

  test("text contrast still fails on the admin user table", async ({ admin, page }) => {
    await admin.gotoUsers();
    expect(await ruleIdsOn(page)).toContain("color-contrast");
  });
});

test.describe("@a11y known defects on a public page", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the sign-in page still marks a link by color alone", async ({ loginPage, page, run }) => {
    await loginPage.gotoTeam(run.alpha.slug);
    await expect(loginPage.submit).toBeVisible();

    expect(await ruleIdsOn(page)).toContain("link-in-text-block");
  });
});
