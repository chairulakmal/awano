import { test, expect } from "@playwright/test";

const DEMO_BUTTONS = [
  { label: "Support", urlPattern: /\/desk/ },
  { label: "Manager", urlPattern: /\/admin/ },
  { label: "Customer", urlPattern: /\/tickets/ },
  { label: "Recruiter", urlPattern: /\/tickets/ },
  { label: "Field Agent", urlPattern: /\/tickets/ },
] as const;

test.describe("Demo login buttons", () => {
  for (const { label, urlPattern } of DEMO_BUTTONS) {
    test(`"${label}" button logs in and redirects correctly`, async ({ page }) => {
      await page.goto("/login?team=demo");
      await page.getByRole("button", { name: label }).click();
      await expect(page.locator('[data-testid="user-menu-trigger"]')).toBeVisible({ timeout: 15_000 });
      await expect(page).toHaveURL(urlPattern);
    });
  }
});
