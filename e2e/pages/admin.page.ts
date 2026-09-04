import { expect, type Locator, type Page } from "@playwright/test";

export class AdminPage {
  readonly categoryName: Locator;
  readonly addCategory: Locator;

  constructor(private readonly page: Page) {
    this.categoryName = page.getByPlaceholder("Category name");
    this.addCategory = page.getByRole("button", { name: "Add category" });
  }

  async gotoDashboard(): Promise<void> {
    await this.page.goto("/admin/dashboard");
    await expect(this.page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  }

  async gotoUsers(): Promise<void> {
    await this.page.goto("/admin/users");
    await expect(this.page.getByRole("heading", { name: "Users" })).toBeVisible();
  }

  async gotoCategories(): Promise<void> {
    await this.page.goto("/admin/categories");
    await expect(this.page.getByRole("heading", { name: "Categories" })).toBeVisible();
  }

  userRow(email: string): Locator {
    return this.page.getByRole("row").filter({ hasText: email });
  }

  categoryRow(name: string): Locator {
    return this.page.getByRole("row").filter({ hasText: name });
  }

  statCard(label: string): Locator {
    return this.page
      .locator("div")
      .filter({ hasText: new RegExp(`^${label}`) })
      .last();
  }

  async changeRole(email: string, optionLabel: string): Promise<void> {
    const row = this.userRow(email);
    await row.getByRole("combobox").selectOption({ label: optionLabel });
    await row.getByRole("button", { name: "Save" }).click();
  }

  async createCategory(name: string): Promise<void> {
    await this.categoryName.fill(name);
    await this.addCategory.click();
    await expect(this.categoryRow(name)).toBeVisible();
  }
}
