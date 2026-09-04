import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

export const ARTIFACT_DIR = path.join(__dirname, "..", ".artifacts");

const RUN_FILE = path.join(ARTIFACT_DIR, "run.json");

export type FixtureUser = {
  id: string;
  email: string;
  name: string;
};

export type FixtureTeam = {
  id: string;
  slug: string;
  categoryIds: string[];
  users: {
    requester: FixtureUser;
    secondRequester: FixtureUser;
    support: FixtureUser;
    secondSupport: FixtureUser;
    manager: FixtureUser;
    admin: FixtureUser;
  };
};

export type RunContext = {
  namespace: string;
  password: string;
  alpha: FixtureTeam;
  bravo: FixtureTeam;
  superUser: FixtureUser;
};

export type TeamKey = "alpha" | "bravo";
export type RoleKey = keyof FixtureTeam["users"];

/**
 * Every run provisions its own teams under a fresh namespace so that runs never
 * collide on the shared development database, and so that no fixture email is
 * ever reused. Reuse would matter: the login rate limiter counts attempts per
 * email for 15 minutes, so repeated runs against one fixed account would start
 * failing to sign in. See docs/TESTING.md, "Test data".
 */
export function createNamespace(): string {
  return `e2e${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function writeRunContext(context: RunContext): void {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  writeFileSync(RUN_FILE, JSON.stringify(context, null, 2));
}

export function readRunContext(): RunContext {
  return JSON.parse(readFileSync(RUN_FILE, "utf8")) as RunContext;
}

/**
 * Storage-state paths must be constant, because `test.use({ storageState })` is
 * evaluated while Playwright collects test files, which happens before the setup
 * project has run. Anything that varies per run is read from run.json instead,
 * inside a fixture.
 */
export function storageStatePath(team: TeamKey | "super", role?: RoleKey): string {
  const name = role ? `${team}-${role}` : team;
  return path.join(ARTIFACT_DIR, `state-${name}.json`);
}

export const STATE = {
  alphaRequester: storageStatePath("alpha", "requester"),
  alphaSecondRequester: storageStatePath("alpha", "secondRequester"),
  alphaSupport: storageStatePath("alpha", "support"),
  alphaManager: storageStatePath("alpha", "manager"),
  alphaAdmin: storageStatePath("alpha", "admin"),
  bravoSupport: storageStatePath("bravo", "support"),
  bravoRequester: storageStatePath("bravo", "requester"),
  superUser: storageStatePath("super"),
} as const;
