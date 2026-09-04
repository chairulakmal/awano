import { test, expect } from "../fixtures";

/*
 * The limiter in src/app/login/actions.ts allows five attempts per email in a
 * fifteen minute window and counts successes as well as failures. It keys on the
 * email alone, so this file only ever uses addresses that belong to no account,
 * which keeps the accounts the rest of the suite signs in with well clear of the
 * ceiling. A retry gets fresh addresses, because the window outlives the run.
 */

test.describe("@security login rate limit", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  // The counter lives in the memory of one server process. A development server
  // that reloads its modules in the middle of the flood restarts the count, and
  // the sixth attempt is then accepted. That is a property of the server, not of
  // the product, so this test alone is allowed a retry.
  test.describe.configure({ retries: 1 });

  test("a sixth attempt is refused, and only for the address that flooded", async ({
    loginPage,
    run,
  }, testInfo) => {
    // Eight sign-in round trips in one test, against a server that answers them
    // one at a time, need more than the default budget for a single test.
    test.setTimeout(120_000);

    const flooded = `flood-${testInfo.retry}@${run.alpha.slug}.test`;
    const bystander = `bystander-${testInfo.retry}@${run.alpha.slug}.test`;

    await loginPage.gotoTeam(run.alpha.slug);

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await loginPage.submitAndWaitForAnswer(flooded, "not-the-password");
      await expect(loginPage.invalidCredentials, `attempt ${attempt}`).toBeVisible();
    }

    await loginPage.submitAndWaitForAnswer(flooded, "not-the-password");
    await expect(loginPage.rateLimited).toBeVisible();

    await loginPage.submitAndWaitForAnswer(bystander, "not-the-password");

    await expect(loginPage.invalidCredentials).toBeVisible();
    await expect(loginPage.rateLimited).toBeHidden();
  });
});
