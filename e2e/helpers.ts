import { expect, type Page } from "@playwright/test";

export const PASSWORD = "oretachinomachida";

export async function login(page: Page, email: string, team: string) {
  await page.goto(`/login?team=${team}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // "Sign out" button confirms the session cookie was accepted.
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 15_000 });
  // Confirms the proxy redirected away from /login.
  // Catches regressions of trustHost: without it, Auth.js falls back to pages.signIn
  // and the user lands back on /login despite a valid session.
  await expect(page).not.toHaveURL(/\/login/);
}
