import { test, expect, type Page } from "@playwright/test";

const PASSWORD = "oretachinomachida";

async function login(page: Page, email: string, team: string) {
  await page.goto(`/login?team=${team}`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible({ timeout: 15_000 });
}

test.describe("Manager — escalate → close → reopen", () => {
  test("manager can walk the full ESCALATED → CLOSED → OPEN cycle", async ({ page }) => {
    // 1. Login as manager — redirects to /admin/dashboard
    await login(page, "manager@awano.demo", "demo");

    // 2. Open seed-ticket-a2 (IN_PROGRESS — reset by globalSetup)
    await page.goto("/desk/seed-ticket-a2");
    await expect(
      page.getByRole("heading", { name: "Tokutei Ginou No. 1 skills exam registration — food service (外食業)" })
    ).toBeVisible();

    // 3. Escalate: IN_PROGRESS → ESCALATED (MANAGER-only transition)
    await page.click('button:has-text("→ Escalated")');
    // After escalation, only ESCALATED → IN_PROGRESS is available
    await expect(page.getByRole("button", { name: "→ In progress", exact: true })).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByRole("button", { name: "→ Escalated", exact: true })).not.toBeVisible();

    // 4. De-escalate: ESCALATED → IN_PROGRESS (necessary to reach RESOLVED)
    await page.getByRole("button", { name: "→ In progress", exact: true }).click();
    await expect(page.getByRole("button", { name: "→ Escalated", exact: true })).toBeVisible({
      timeout: 8_000,
    });

    // 5. Resolve: IN_PROGRESS → RESOLVED
    await page.click('button:has-text("→ Resolved")');
    await expect(page.getByRole("button", { name: "→ Closed", exact: true })).toBeVisible({
      timeout: 8_000,
    });

    // 6. Close: RESOLVED → CLOSED (MANAGER-accessible, min SUPPORT)
    await page.getByRole("button", { name: "→ Closed", exact: true }).click();
    await expect(page.getByRole("button", { name: "→ Open", exact: true })).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByRole("button", { name: "→ Closed", exact: true })).not.toBeVisible();

    // 7. Reopen: CLOSED → OPEN (MANAGER-only transition)
    await page.getByRole("button", { name: "→ Open", exact: true }).click();
    await expect(page.getByRole("button", { name: "→ In progress", exact: true })).toBeVisible({
      timeout: 8_000,
    });
    await expect(page.getByRole("button", { name: "→ Open", exact: true })).not.toBeVisible();
  });
});
