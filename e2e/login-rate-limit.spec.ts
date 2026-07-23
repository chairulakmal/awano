import { test, expect } from "@playwright/test";

// Non-existent email; no real account is locked by this test.
const RATE_LIMIT_EMAIL = "ratelimit-test@awano.demo";
const MAX_ATTEMPTS = 5;

test.describe("Login: rate limiting", () => {
  test("blocks further attempts after too many failures", async ({ page }) => {
    // Submit MAX_ATTEMPTS + 1 bad attempts. Each iteration waits for any error
    // response so it handles re-runs within the same window (where the limit
    // is already hit from attempt #1).
    for (let i = 0; i <= MAX_ATTEMPTS; i++) {
      await page.goto("/login?team=demo");
      await page.fill('input[name="email"]', RATE_LIMIT_EMAIL);
      await page.fill('input[name="password"]', "wrong-password");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.locator("p.text-red-600")).toBeVisible({ timeout: 10_000 });
    }

    // After exhausting the limit the error must be the rate-limit message.
    await expect(page.locator("p.text-red-600")).toHaveText(/too many/i);
  });
});
