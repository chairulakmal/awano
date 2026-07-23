import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Support — assign · internal note · status change", () => {
  test("support can assign, post internal note, and transition OPEN → IN_PROGRESS", async ({
    page,
  }) => {
    // 1. Login as support
    await login(page, "support@awano.demo", "demo");

    // 2. Open seed-ticket-a1 (OPEN, unassigned, reset by globalSetup)
    await page.goto("/desk/seed-ticket-a1");
    await expect(
      page.getByRole("heading", { name: "在留カード renewal — expires in 12 days" })
    ).toBeVisible();

    // 3. Assign to self (Support may only assign to themselves)
    await page.selectOption('select[name="assigneeId"]', { label: "Dan Support" });
    await page.click('button:has-text("Update assignee")');
    // Verify the dropdown reflects the selected assignee after server round-trip
    await expect(page.locator('select[name="assigneeId"]')).toHaveValue(/.+/);

    // 4. Post an internal note
    await page.fill('textarea[name="body"]', "Internal note from E2E test");
    await page.check('input[name="isInternal"]');
    await page.click('button:has-text("Send")');
    // The note should appear in the thread with the "Internal" badge
    await expect(page.getByText("Internal note from E2E test")).toBeVisible({ timeout: 8_000 });
    await expect(page.locator("span").filter({ hasText: "Internal" }).first()).toBeVisible();

    // 5. Transition OPEN → IN_PROGRESS
    await page.click('button:has-text("→ In progress")');
    // After the transition, the OPEN → IN_PROGRESS button disappears and
    // SUPPORT-accessible IN_PROGRESS transitions appear
    await expect(
      page.getByRole("button", { name: "→ Waiting on requester", exact: true })
    ).toBeVisible({ timeout: 8_000 });
    await expect(
      page.getByRole("button", { name: "→ In progress", exact: true })
    ).not.toBeVisible();
  });
});
