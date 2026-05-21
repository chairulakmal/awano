import { test, expect } from "@playwright/test";
import { login } from "./helpers";

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

    // The Team A ticket subject is not rendered anywhere on the page
    await expect(page.getByText("在留カード renewal — expires in 12 days")).not.toBeVisible();
  });
});
