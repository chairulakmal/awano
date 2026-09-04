import { expect, type Locator, type Page } from "@playwright/test";

/** The requester-facing side of the product: /tickets and /tickets/new. */
export class PortalPage {
  readonly newTicketLink: Locator;
  readonly category: Locator;
  readonly subject: Locator;
  readonly body: Locator;
  readonly submit: Locator;
  readonly empty: Locator;
  readonly reply: Locator;
  readonly sendReply: Locator;

  constructor(private readonly page: Page) {
    this.newTicketLink = page.getByRole("link", { name: "New ticket" });
    this.category = page.getByLabel("Category");
    this.subject = page.getByLabel("Subject");
    this.body = page.getByLabel("Details");
    this.submit = page.getByRole("button", { name: "Submit ticket" });
    this.empty = page.getByText("No tickets yet.");
    this.reply = page.getByPlaceholder(/write your reply/i);
    this.sendReply = page.getByRole("button", { name: "Send reply" });
  }

  async gotoList(): Promise<void> {
    await this.page.goto("/tickets");
    await expect(this.page.getByRole("heading", { name: "My tickets" })).toBeVisible();
  }

  async gotoNew(): Promise<void> {
    await this.page.goto("/tickets/new");
    await expect(this.page.getByRole("heading", { name: "New ticket" })).toBeVisible();
  }

  async gotoTicket(id: string): Promise<void> {
    await this.page.goto(`/tickets/${id}`);
  }

  ticket(subject: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(escapeForRegExp(subject)) });
  }

  /** Returns the id of the ticket that was created, taken from the redirect URL. */
  async createTicket(subject: string, body: string, categoryLabel: string): Promise<string> {
    await this.category.selectOption({ label: categoryLabel });
    await this.subject.fill(subject);
    await this.body.fill(body);
    await this.submit.click();
    await this.page.waitForURL(/\/tickets\/[^/]+$/);
    return this.page.url().split("/").pop()!;
  }
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
