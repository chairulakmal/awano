import { test, expect } from "../fixtures";
import { getUserRole } from "../support/factory";
import { STATE } from "../support/run-context";

/*
 * Two rules govern this screen. A role may only be granted up to the ceiling in
 * src/lib/users/service.ts, and a requester reaches Support only after being
 * marked a field agent. Both are enforced on the server; the table is expected
 * to stop the user before they get that far.
 */

test.describe("User administration as an admin", () => {
  test.use({ storageState: STATE.alphaAdmin });

  test("a customer requester is not offered Support", async ({ admin, factory, run }) => {
    const user = await factory.user({
      team: run.alpha,
      label: "customer",
      role: "REQUESTER",
      requesterType: "CUSTOMER",
    });

    await admin.gotoUsers();
    const row = admin.userRow(user.email);

    await expect(row.getByRole("combobox")).not.toContainText("Support");
    await expect(row).toContainText("Set to Field Agent first to unlock Support");
  });

  test("marking a requester as a field agent unlocks Support", async ({ admin, factory, run }) => {
    const user = await factory.user({
      team: run.alpha,
      label: "promotable",
      role: "REQUESTER",
      requesterType: "CUSTOMER",
    });

    await admin.gotoUsers();
    await admin.changeRole(user.email, "Requester (Field Agent)");
    await expect.poll(async () => (await getUserRole(user.id)).requesterType).toBe("FIELD_AGENT");

    await admin.changeRole(user.email, "Support");

    await expect.poll(async () => (await getUserRole(user.id)).role).toBe("SUPPORT");
  });

  test("an admin may not grant a role above their own ceiling", async ({ admin, factory, run }) => {
    const user = await factory.user({ team: run.alpha, label: "agent", role: "SUPPORT" });

    await admin.gotoUsers();

    // The ceiling for ADMIN is MANAGER, so Admin never appears in the list.
    await expect(admin.userRow(user.email).getByRole("combobox")).not.toContainText("Admin");
  });
});

test.describe("User administration as a manager", () => {
  test.use({ storageState: STATE.alphaManager });

  test("a manager cannot change the role of an admin", async ({ admin, run }) => {
    await admin.gotoUsers();

    await expect(admin.userRow(run.alpha.users.admin.email).getByRole("combobox")).toHaveCount(0);
  });

  test("nobody can change their own role", async ({ admin, run }) => {
    await admin.gotoUsers();

    await expect(admin.userRow(run.alpha.users.manager.email).getByRole("combobox")).toHaveCount(0);
  });
});

test.describe("Category administration", () => {
  test.use({ storageState: STATE.alphaAdmin });

  test("a category added here becomes selectable for requesters", async ({
    admin,
    browser,
    factory,
    run,
  }) => {
    const name = factory.subject("Bicycle registration");
    factory.trackCategory(run.alpha, name);

    await admin.gotoCategories();
    await admin.createCategory(name);

    // The point of the feature is the other side of the product, so the check
    // crosses to a requester session rather than stopping at the admin table.
    const requesterContext = await browser.newContext({ storageState: STATE.alphaRequester });
    const requesterPage = await requesterContext.newPage();
    await requesterPage.goto("/tickets/new");

    await expect(requesterPage.getByLabel("Category")).toContainText(name);
    await requesterContext.close();
  });
});
