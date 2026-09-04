import { test, expect } from "../fixtures";
import { teamExists } from "../support/factory";

/*
 * The login rate limiter allows five attempts per email per fifteen minutes, and
 * counts successful attempts too. Each test below therefore uses an account that
 * no other test and no setup step signs in with, which leaves room for retries.
 */

test.describe("Sign in", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a team member signs in with valid credentials", async ({ loginPage, run }) => {
    await loginPage.gotoTeam(run.bravo.slug);
    await loginPage.submitCredentials(run.bravo.users.manager.email, run.password);
    await loginPage.expectSignedIn();
  });

  test("a super user signs in on the platform page, without a team", async ({ loginPage, run }) => {
    await loginPage.gotoPlatform();
    await loginPage.submitCredentials(run.superUser.email, run.password);
    await loginPage.expectSignedIn();
  });

  test("a wrong password is refused", async ({ page, loginPage, run }) => {
    await loginPage.gotoTeam(run.alpha.slug);
    await loginPage.submitCredentials(run.alpha.users.secondSupport.email, "not-the-password");

    await expect(loginPage.invalidCredentials).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId("user-menu-trigger")).toBeHidden();
  });

  test("an account is not reachable through another team's sign-in page", async ({
    loginPage,
    run,
  }) => {
    await loginPage.gotoTeam(run.alpha.slug);
    await loginPage.submitCredentials(run.bravo.users.admin.email, run.password);

    await expect(loginPage.invalidCredentials).toBeVisible();
  });

  test("a team member cannot sign in on the platform page", async ({ loginPage, run }) => {
    await loginPage.gotoPlatform();
    await loginPage.submitCredentials(run.bravo.users.secondRequester.email, run.password);

    await expect(loginPage.invalidCredentials).toBeVisible();
  });
});

test.describe("Sign out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("signing out ends the session", async ({ page, loginPage, run }) => {
    await loginPage.gotoTeam(run.bravo.slug);
    await loginPage.submitCredentials(run.bravo.users.secondSupport.email, run.password);
    await loginPage.expectSignedIn();

    await page.getByTestId("user-menu-trigger").click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByTestId("user-menu-trigger")).toBeHidden();

    await page.goto("/desk");
    await expect(page).toHaveURL(/\/login/);
  });
});

/*
 * The demo accounts are shared, and the login limiter counts successful sign-ins,
 * so five demo sign-ins in fifteen minutes lock the account for every visitor.
 * Running the suite several times in a row is enough to trip it. These tests skip
 * on that outcome rather than report a broken button, and the defect itself is
 * recorded in docs/TESTING.md under "Known defects".
 */
const LOCKED_REASON = "the shared demo account is locked by the login rate limit";

test.describe("Demo accounts", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async () => {
    test.skip(!(await teamExists("demo")), "the demo team is not seeded in this database");
  });

  test("the demo buttons replace the credentials form", async ({ page, loginPage }) => {
    await loginPage.gotoTeam("demo");
    await expect(page.getByText("Try a demo account")).toBeVisible();
    await expect(loginPage.email).toBeHidden();
    await expect(page.getByRole("button", { name: "Support", exact: true })).toBeVisible();
  });

  test("a demo button signs the visitor in", async ({ page, loginPage }) => {
    await loginPage.gotoTeam("demo");
    await page.getByRole("button", { name: "Manager", exact: true }).click();
    test.skip((await loginPage.demoOutcome()) === "locked", LOCKED_REASON);
    await loginPage.expectSignedIn();
  });

  // Known defect: the sign-in action redirects to "/", and the route guard that
  // forwards an authenticated visitor to their workspace does not run on that
  // client-side navigation, so the visitor is left on the marketing page. A
  // reload of "/" does redirect correctly. Recorded in docs/TESTING.md under
  // "Known defects"; remove test.fail() when the redirect is fixed.
  test("a demo sign-in should land on the role workspace", async ({ page, loginPage }) => {
    await loginPage.gotoTeam("demo");
    await page.getByRole("button", { name: "Customer", exact: true }).click();
    test.skip((await loginPage.demoOutcome()) === "locked", LOCKED_REASON);
    test.fail();
    await loginPage.expectSignedIn();
    await expect(page).toHaveURL(/\/tickets/);
  });
});
