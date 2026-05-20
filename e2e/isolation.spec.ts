import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "oretachinomachida";

async function login(page: Page, email: string, team: string) {
  await page.goto(`/login?team=${team}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Cross-team isolation", () => {
  test("Team B support cannot view Team A ticket", async ({ page }) => {
    // Login as Team B support (support@beta.demo, SUPPORT role in team beta)
    await login(page, "support@beta.demo", "beta");

    // Attempt to access a Team A ticket directly by ID
    // The desk route guard allows SUPPORT through, but getTicket calls
    // assertSameTeam which throws AuthorizationError → Next.js notFound() → 404
    const response = await page.goto("/desk/seed-ticket-a1");

    // Server responds with 404 (cross-team access blocked at service layer)
    expect(response?.status()).toBe(404);

    // No redirect to login — this is an isolation failure, not an auth failure
    expect(page.url()).not.toContain("/login");

    // The Team A ticket subject is not rendered
    await expect(page.getByText("Cannot log in to my account")).not.toBeVisible();
  });
});
