import { test, expect } from "../fixtures";
import { STATE } from "../support/run-context";

/*
 * The route guard in src/proxy.ts decides which roles may open which section.
 * A visitor who is refused is sent to /login, and /login immediately sends an
 * authenticated visitor on to the home page of their role, so a refusal for a
 * signed-in user ends on that home page rather than on the login form.
 */

const GUARDED_PATHS = [
  "/desk",
  "/admin/dashboard",
  "/admin/users",
  "/admin/categories",
  "/admin/tickets",
  "/super/teams",
  "/tickets",
  "/tickets/new",
  "/profile",
] as const;

type Path = (typeof GUARDED_PATHS)[number];

type RoleCase = {
  role: string;
  state: string | { cookies: []; origins: [] };
  home: string;
  allowed: Path[];
};

const ROLES: RoleCase[] = [
  {
    role: "Anonymous",
    state: { cookies: [], origins: [] },
    home: "/login",
    allowed: [],
  },
  {
    role: "Requester",
    state: STATE.alphaRequester,
    home: "/tickets",
    allowed: ["/tickets", "/tickets/new", "/profile"],
  },
  {
    role: "Support",
    state: STATE.alphaSupport,
    home: "/desk",
    allowed: ["/desk", "/profile"],
  },
  {
    role: "Manager",
    state: STATE.alphaManager,
    home: "/admin/dashboard",
    allowed: [
      "/desk",
      "/admin/dashboard",
      "/admin/users",
      "/admin/categories",
      "/admin/tickets",
      "/profile",
    ],
  },
  {
    role: "Admin",
    state: STATE.alphaAdmin,
    home: "/admin/dashboard",
    allowed: [
      "/desk",
      "/admin/dashboard",
      "/admin/users",
      "/admin/categories",
      "/admin/tickets",
      "/profile",
    ],
  },
  {
    role: "Super",
    state: STATE.superUser,
    home: "/super/teams",
    allowed: ["/super/teams", "/profile"],
  },
];

for (const { role, state, home, allowed } of ROLES) {
  test.describe(`@security route guard: ${role}`, () => {
    test.use({ storageState: state });

    for (const path of GUARDED_PATHS) {
      const permitted = allowed.includes(path);

      test(`${permitted ? "may open" : "is refused"} ${path}`, async ({ page }) => {
        const response = await page.goto(path);
        expect(response?.status(), `${role} requesting ${path}`).toBeLessThan(400);

        if (permitted) {
          await expect(page).toHaveURL(new RegExp(`${path}$`));
        } else {
          await expect(page).toHaveURL(new RegExp(`${home}$`));
        }
      });
    }
  });
}

test.describe("@security route guard: ticket detail", () => {
  test.use({ storageState: STATE.alphaRequester });

  test("a requester cannot reach the agent view of their own ticket", async ({
    page,
    deskTicket,
    factory,
    run,
  }) => {
    const ticket = await factory.ticket({ team: run.alpha });

    await page.goto(`/desk/${ticket.id}`);

    // The guard sends the requester to their own portal list, which does list the
    // ticket they filed. What the redirect must withhold is every agent control.
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(deskTicket.assigneeSelect).toBeHidden();
    await expect(deskTicket.internalNote).toBeHidden();
  });
});
