import { test as setup, expect, type Page } from "@playwright/test";
import { LoginPage } from "../pages/login.page";
import { createTicket, deleteTickets } from "../support/factory";
import { readRunContext, STATE, type FixtureUser } from "../support/run-context";

// The warm-up below reuses the cookies the first step writes.
setup.describe.configure({ mode: "serial" });

/**
 * Signing in once per role and reusing the cookie keeps the login form out of
 * every other test. It also keeps each fixture email under the login rate limit,
 * which allows five attempts per email per fifteen minutes.
 */
async function signIn(page: Page, teamSlug: string | null, user: FixtureUser, password: string) {
  const login = new LoginPage(page);
  if (teamSlug) await login.gotoTeam(teamSlug);
  else await login.gotoPlatform();
  await login.submitCredentials(user.email, password);
  await login.expectSignedIn();
}

setup("authenticate every role", async ({ browser }) => {
  setup.setTimeout(120_000);
  const run = readRunContext();

  const accounts = [
    { file: STATE.alphaRequester, team: run.alpha.slug, user: run.alpha.users.requester },
    {
      file: STATE.alphaSecondRequester,
      team: run.alpha.slug,
      user: run.alpha.users.secondRequester,
    },
    { file: STATE.alphaSupport, team: run.alpha.slug, user: run.alpha.users.support },
    { file: STATE.alphaManager, team: run.alpha.slug, user: run.alpha.users.manager },
    { file: STATE.alphaAdmin, team: run.alpha.slug, user: run.alpha.users.admin },
    { file: STATE.bravoSupport, team: run.bravo.slug, user: run.bravo.users.support },
    { file: STATE.bravoRequester, team: run.bravo.slug, user: run.bravo.users.requester },
    { file: STATE.superUser, team: null, user: run.superUser },
  ];

  for (const { file, team, user } of accounts) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, team, user, run.password);
    await context.storageState({ path: file });
    await context.close();
  }
});

/**
 * The development server compiles a route the first time it is requested. Paying
 * that cost once here stops the first test that touches each route from paying
 * it inside its own timeout.
 */
setup("warm up application routes", async ({ browser }) => {
  setup.setTimeout(120_000);
  const run = readRunContext();

  // The two ticket detail routes are the largest in the product, and neither can
  // be requested without a real row, so the warm-up creates one and removes it.
  const ticket = await createTicket({ team: run.alpha, subject: "Route warm-up" });

  const warmups = [
    { state: STATE.alphaSupport, paths: ["/desk", `/desk/${ticket.id}`] },
    { state: STATE.alphaManager, paths: ["/admin/dashboard", "/admin/users", "/admin/categories"] },
    { state: STATE.alphaRequester, paths: ["/tickets", "/tickets/new", `/tickets/${ticket.id}`] },
  ];

  for (const { state, paths } of warmups) {
    const context = await browser.newContext({ storageState: state });
    const page = await context.newPage();
    for (const path of paths) {
      const response = await page.goto(path);
      expect(response?.status(), `warming ${path}`).toBeLessThan(400);
    }
    await context.close();
  }

  await deleteTickets([ticket.id]);
});
