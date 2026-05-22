import { expect, type Page } from "@playwright/test";

export const PASSWORD = "oretachinomachida";

export async function login(page: Page, email: string, team: string) {
  await page.goto(`/login?team=${team}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // UserMenu trigger (aria-haspopup) is always visible when a session is active.
  // Catches regressions of trustHost: without it, Auth.js falls back to pages.signIn
  // and the user lands back on /login despite a valid session.
  await expect(page.locator('[data-testid="user-menu-trigger"]')).toBeVisible({ timeout: 15_000 });
  await expect(page).not.toHaveURL(/\/login/);
}
