import { expect, type Locator, type Page } from "@playwright/test";
import type { TicketStatus } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  WAITING_ON_REQUESTER: "Waiting on requester",
  ESCALATED: "Escalated",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export class DeskTicketPage {
  readonly assigneeSelect: Locator;
  readonly updateAssignee: Locator;
  readonly prioritySelect: Locator;
  readonly updatePriority: Locator;
  readonly replyBody: Locator;
  readonly internalNote: Locator;
  readonly send: Locator;
  readonly toast: Locator;

  constructor(private readonly page: Page) {
    this.assigneeSelect = page.locator('select[name="assigneeId"]');
    this.updateAssignee = page.getByRole("button", { name: "Update assignee" });
    this.prioritySelect = page.locator('select[name="priority"]');
    this.updatePriority = page.getByRole("button", { name: "Update priority" });
    this.replyBody = page.getByPlaceholder("Write a reply or internal note…");
    this.internalNote = page.getByLabel("Internal note");
    this.send = page.getByRole("button", { name: "Send" });
    this.toast = page.getByRole("status");
  }

  async goto(ticketId: string): Promise<void> {
    await this.page.goto(`/desk/${ticketId}`);
  }

  heading(subject: string): Locator {
    return this.page.getByRole("heading", { name: subject, level: 1 });
  }

  /** One button per transition the finite state machine allows for this role. */
  transition(to: TicketStatus): Locator {
    return this.page.getByRole("button", { name: `→ ${STATUS_LABEL[to]}`, exact: true });
  }

  /**
   * The status badge updates optimistically, so it alone cannot prove the server
   * accepted the move. The success toast carries the exact message the server
   * action returned, which is why the move is confirmed by the toast first.
   */
  async moveTo(to: TicketStatus): Promise<void> {
    await this.transition(to).click();
    await expect(this.toast.filter({ hasText: `Moved to ${STATUS_LABEL[to]}` })).toBeVisible();
  }

  async expectStatus(status: TicketStatus): Promise<void> {
    await expect(this.statusBadge).toHaveText(STATUS_LABEL[status]);
  }

  /** Every name the assignee dropdown offers, in the order it renders them. */
  get assigneeOptions(): Locator {
    return this.assigneeSelect.locator("option");
  }

  get statusBadge(): Locator {
    return this.page.getByTestId("ticket-status");
  }

  comment(body: string): Locator {
    return this.page.getByText(body, { exact: true });
  }

  /**
   * The comment form calls reset() in an effect that also runs on mount, so a
   * value typed before the page hydrates is discarded. Filling inside toPass
   * repeats the entry if that happens, which is what makes the post reliable.
   */
  async postComment(body: string, options: { internal?: boolean } = {}): Promise<void> {
    await expect(async () => {
      await this.replyBody.fill(body);
      if (options.internal) await this.internalNote.check();
      await expect(this.replyBody).toHaveValue(body);
      if (options.internal) await expect(this.internalNote).toBeChecked();
    }).toPass({ timeout: 15_000 });

    await this.send.click();
    await expect(this.comment(body)).toBeVisible();
  }

  async assignTo(name: string): Promise<void> {
    await this.assigneeSelect.selectOption({ label: name });
    await this.updateAssignee.click();
  }

  async setPriority(label: string): Promise<void> {
    await this.prioritySelect.selectOption({ label });
    await this.updatePriority.click();
  }
}
