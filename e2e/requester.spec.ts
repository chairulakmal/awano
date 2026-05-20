import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "oretachinomachida";

async function login(page: Page, email: string, team: string) {
  await page.goto(`/login?team=${team}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  // "Sign out" appears in the header only for authenticated users;
  // waiting for it is more reliable than waitForURL with App Router redirects
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Requester — field agent flow", () => {
  test("login → create ticket → appears in My tickets", async ({ page }) => {
    // 1. Login as field agent
    await login(page, "agent@awano.demo", "demo");

    // 2. Navigate to new ticket form
    await page.goto("/tickets/new");
    await expect(page.getByRole("heading", { name: "New ticket" })).toBeVisible();

    // 3. Fill the form with a unique subject so we can identify it in the list
    const subject = `E2E agent ticket ${Date.now()}`;
    await page.selectOption('select[name="categoryId"]', { index: 1 });
    await page.fill('input[name="subject"]', subject);
    await page.fill('textarea[name="body"]', "Automated E2E test — please ignore.");

    // 4. Submit — action redirects to /tickets/:id on success
    await page.getByRole("button", { name: "Submit ticket" }).click();
    await page.waitForURL(/\/tickets\/[a-z0-9]{10,}/, { timeout: 10_000 });

    // 5. Go to My tickets list and verify the new ticket is listed
    await page.goto("/tickets");
    await expect(page.getByText(subject)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Open")).toBeVisible();
  });
});
