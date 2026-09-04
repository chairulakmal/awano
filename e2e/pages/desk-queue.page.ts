import { expect, type Locator, type Page } from "@playwright/test";

export type DeskView = "unassigned" | "mine" | "open" | "escalated";

const VIEW_LABEL: Record<DeskView, string> = {
  unassigned: "Unassigned",
  mine: "Mine",
  open: "Open",
  escalated: "Escalated",
};

export class DeskQueuePage {
  readonly search: Locator;
  readonly empty: Locator;
  readonly loadMore: Locator;
  readonly items: Locator;

  constructor(private readonly page: Page) {
    this.search = page.getByPlaceholder("Search tickets…");
    this.empty = page.getByText("No tickets here.");
    this.loadMore = page.getByRole("button", { name: "Load more" });
    // The sidebar renders list items too, so the rows are addressed by the link
    // target that only a ticket row has.
    this.items = page.locator('a[href^="/desk/"]');
  }

  async goto(view: DeskView = "unassigned"): Promise<void> {
    await this.page.goto(`/desk?view=${view}`);
    await expect(this.page.getByRole("heading", { name: "Inbox" })).toBeVisible();
  }

  async selectView(view: DeskView): Promise<void> {
    await this.page.getByRole("link", { name: VIEW_LABEL[view], exact: true }).click();
    await this.page.waitForURL(new RegExp(`view=${view}`));
  }

  ticket(subject: string): Locator {
    return this.page.getByRole("link", { name: new RegExp(escapeForRegExp(subject)) });
  }

  async open(subject: string): Promise<void> {
    await this.ticket(subject).click();
    await this.page.waitForURL(/\/desk\/[^/]+$/);
  }

  /**
   * The sidebar debounces typing for 300 ms before pushing the query into the
   * URL, so waiting for the committed query is what makes the search assertions
   * deterministic rather than racing the debounce.
   */
  async searchFor(query: string): Promise<void> {
    await this.search.fill(query);
    await this.page.waitForURL((url) => url.searchParams.get("q") === query);
  }

  async clearSearch(): Promise<void> {
    await this.search.fill("");
    await this.page.waitForURL((url) => !url.searchParams.has("q"));
  }
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
