import { test as setup } from "@playwright/test";
import {
  FIXTURE_PASSWORD,
  hashFixturePassword,
  provisionSuperUser,
  provisionTeam,
  sweepAbandonedFixtures,
} from "../support/factory";
import { createNamespace, writeRunContext } from "../support/run-context";

const ABANDONED_AFTER_MS = 2 * 60 * 60 * 1000;

setup("provision fixture teams", async () => {
  setup.setTimeout(60_000);

  const removed = await sweepAbandonedFixtures(ABANDONED_AFTER_MS);
  if (removed > 0) console.log(`Removed ${removed} abandoned fixture team(s)`);

  const namespace = createNamespace();
  const passwordHash = await hashFixturePassword();

  const [alpha, bravo, superUser] = await Promise.all([
    provisionTeam(namespace, "alpha", passwordHash),
    provisionTeam(namespace, "bravo", passwordHash),
    provisionSuperUser(namespace, passwordHash),
  ]);

  writeRunContext({ namespace, password: FIXTURE_PASSWORD, alpha, bravo, superUser });
  console.log(`Provisioned fixture namespace ${namespace}`);
});
