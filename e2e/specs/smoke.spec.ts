import { test, expect } from "../fixtures";
import { STATE } from "../support/run-context";

test.describe("@smoke public pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("the marketing page offers a route into the demo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /try the demo/i })).toBeVisible();
  });

  test("a team sign-in page asks for credentials", async ({ page, loginPage, run }) => {
    await loginPage.gotoTeam(run.alpha.slug);
    await expect(page.getByRole("heading", { name: "Sign in to Awano" })).toBeVisible();
    await expect(page.getByText(run.alpha.slug)).toBeVisible();
    await expect(loginPage.email).toBeVisible();
    await expect(loginPage.submit).toBeEnabled();
  });
});

const HOMES = [
  { role: "Requester", state: STATE.alphaRequester, path: "/tickets", heading: "My tickets" },
  { role: "Support", state: STATE.alphaSupport, path: "/desk", heading: "Inbox" },
  { role: "Manager", state: STATE.alphaManager, path: "/admin/dashboard", heading: "Dashboard" },
  { role: "Admin", state: STATE.alphaAdmin, path: "/admin/dashboard", heading: "Dashboard" },
  { role: "Super", state: STATE.superUser, path: "/super/teams", heading: "Teams" },
] as const;

for (const { role, state, path, heading } of HOMES) {
  test.describe(`@smoke ${role} workspace`, () => {
    test.use({ storageState: state });

    test(`${role} can open ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
      await expect(page.getByTestId("user-menu-trigger")).toBeVisible();
    });
  });
}
