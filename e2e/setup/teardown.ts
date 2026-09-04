import { test as teardown } from "@playwright/test";
import { existsSync, rmSync } from "node:fs";
import { disconnectDb } from "../support/db";
import { dropNamespace } from "../support/factory";
import { ARTIFACT_DIR, readRunContext } from "../support/run-context";

teardown("remove fixture data", async () => {
  teardown.setTimeout(60_000);

  if (existsSync(`${ARTIFACT_DIR}/run.json`)) {
    const { namespace } = readRunContext();
    await dropNamespace(namespace);
    console.log(`Removed fixture namespace ${namespace}`);
  }

  await disconnectDb();
  rmSync(ARTIFACT_DIR, { recursive: true, force: true });
});
