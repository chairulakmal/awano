import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const CI = !!process.env.CI;
const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

/**
 * Selects a slice of the suite by tag, for example E2E_TAG=@security. The filter
 * is set per project rather than with the --grep flag, because --grep also hides
 * the setup tests that every project depends on.
 */
const TAG = process.env.E2E_TAG ? new RegExp(process.env.E2E_TAG) : undefined;

/** Tags whose risk depends on screen size or on assistive technology. */
const MOBILE_TAGS = /@responsive|@a11y/;

/**
 * The phone project runs the mobile tags and nothing else, so a selected tag has
 * to be narrowed to that set rather than replace it. Playwright takes one regular
 * expression per project, and two lookaheads are how one expression asks for both
 * conditions at once. Selecting @security therefore leaves this project empty.
 */
const MOBILE_GREP = TAG
  ? new RegExp(`(?=.*(?:${MOBILE_TAGS.source}))(?=.*(?:${TAG.source}))`)
  : MOBILE_TAGS;

/**
 * Tests are isolated by data, not by ordering: each one provisions the rows it
 * asserts on and deletes them afterwards, so they run in parallel against a
 * single database. See docs/TESTING.md for the strategy behind this file.
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  workers: CI ? 2 : 4,

  forbidOnly: CI,
  retries: CI ? 2 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: CI
    ? [["github"], ["blob"], ["junit", { outputFile: "test-results/junit.xml" }]]
    : [["list"], ["html", { open: "never" }]],

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: CI ? "retain-on-failure" : "off",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    testIdAttribute: "data-testid",
  },

  projects: [
    {
      name: "provision",
      testMatch: /setup\/provision\.setup\.ts/,
      teardown: "cleanup",
    },
    {
      name: "auth",
      testMatch: /setup\/auth\.setup\.ts/,
      dependencies: ["provision"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "cleanup",
      testMatch: /setup\/teardown\.ts/,
    },
    {
      name: "chromium",
      testDir: "./e2e/specs",
      ...(TAG ? { grep: TAG } : {}),
      dependencies: ["auth"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Only the specs tagged @responsive or @a11y run here; the rest would add
      // runtime without testing anything the desktop project does not already cover.
      name: "mobile-chrome",
      testDir: "./e2e/specs",
      grep: MOBILE_GREP,
      dependencies: ["auth"],
      use: { ...devices["Pixel 7"] },
    },
  ],

  webServer: {
    command: CI ? "npm run start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 180_000,
    stdout: "pipe",
  },
});
