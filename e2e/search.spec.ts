import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Desk: ticket search", () => {
  test("shows no tickets for a nonsense query", async ({ page }) => {
    await login(page, "support@awano.demo", "demo");
    await page.goto("/desk");

    await page.fill('input[placeholder="Search tickets…"]', "xyzzy-no-match-99999");
    await expect(page.getByText("No tickets here.")).toBeVisible({ timeout: 10_000 });
  });

  test("clearing search restores results", async ({ page }) => {
    await login(page, "support@awano.demo", "demo");
    await page.goto("/desk");

    const input = page.locator('input[placeholder="Search tickets…"]');
    await input.fill("xyzzy-no-match-99999");
    await expect(page.getByText("No tickets here.")).toBeVisible({ timeout: 10_000 });

    await input.fill("");
    await expect(page.getByText("No tickets here.")).not.toBeVisible({ timeout: 10_000 });
  });
});
