import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly invalidCredentials: Locator;
  readonly rateLimited: Locator;

  constructor(private readonly page: Page) {
    this.email = page.getByLabel("Email");
    this.password = page.getByLabel("Password");
    this.submit = page.getByRole("button", { name: "Sign in" });
    this.invalidCredentials = page.getByText("Invalid email or password.");
    this.rateLimited = page.getByText("Too many login attempts. Please try again later.");
  }

  async gotoTeam(slug: string): Promise<void> {
    await this.page.goto(`/login?team=${slug}`);
  }

  /** The platform sign-in page, which has no team and is reserved for super users. */
  async gotoPlatform(): Promise<void> {
    await this.page.goto("/login");
  }

  /**
   * Fills the form and submits it. React clears an uncontrolled form once the
   * action it was given finishes, and on a repeated sign-in that clearing can
   * land between the two fills. Both fields are required, so a cleared one makes
   * the browser refuse the submission and no request leaves the page at all.
   * Filling inside a retry block is what stops that from happening.
   */
  async submitCredentials(email: string, password: string): Promise<void> {
    await expect(async () => {
      await this.email.fill(email);
      await this.password.fill(password);
      await expect(this.email).toHaveValue(email);
      await expect(this.password).toHaveValue(password);
    }).toPass({ timeout: 15_000 });

    await this.submit.click();
  }

  /**
   * Submits and waits for the server action to answer. Every refused attempt
   * renders the same sentence, so the response is the only thing that tells one
   * attempt apart from the attempt before it.
   */
  async submitAndWaitForAnswer(email: string, password: string): Promise<void> {
    // The wait is generous on purpose. It inherits actionTimeout otherwise, and a
    // development server that recompiles the route under a full parallel run can
    // take longer than that to answer one sign-in.
    const answered = this.page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && new URL(response.url()).pathname === "/login",
      { timeout: 45_000 }
    );
    await this.submitCredentials(email, password);
    await answered;
  }

  /**
   * Waits for a demo sign-in to settle, and reports which way it settled. The
   * demo accounts are shared, and the login limiter counts successful sign-ins,
   * so five demo sign-ins in fifteen minutes lock the account for every visitor.
   * A refusal is therefore a possible outcome of a correct click, not proof of a
   * broken button. docs/TESTING.md section "Known defects" records the defect.
   */
  async demoOutcome(): Promise<"signed-in" | "locked"> {
    await expect(this.page.getByTestId("user-menu-trigger").or(this.rateLimited)).toBeVisible();
    return (await this.rateLimited.isVisible()) ? "locked" : "signed-in";
  }

  /**
   * A successful sign-in is confirmed by the user menu, not by the URL. Auth.js
   * falls back to the sign-in page when host trust is misconfigured, and the
   * session cookie is the only reliable signal that it did not.
   */
  async expectSignedIn(): Promise<void> {
    await expect(this.page.getByTestId("user-menu-trigger")).toBeVisible();
    await expect(this.page).not.toHaveURL(/\/login/);
  }
}
