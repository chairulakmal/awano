# End-to-end testing

This document explains how the Playwright suite in [`e2e/`](../e2e) is designed, what it covers, and how to run it. The most important rule is that no test depends on data another test can change: every test creates the rows it asserts on and deletes them when it finishes, which is what allows the whole suite to run in parallel against one database that is shared with local development. The sections below cover how to run the suite, the eight design decisions behind it, the project graph, the coverage matrix, how the suite protects a shared database, the test tags, the defects it currently records, and what it deliberately does not test.

For the unit suite (Vitest), see [`docs/SPEC.md`](SPEC.md) section "Testing". For the roles, the permission rules, and the ticket state machine that this suite verifies, see the same document.

## Table of contents

- [Running the suite](#running-the-suite)
- [Design decisions](#design-decisions)
- [The project graph](#the-project-graph)
- [Test data](#test-data)
- [Coverage](#coverage)
- [Safety on a shared database](#safety-on-a-shared-database)
- [Tags](#tags)
- [Known defects](#known-defects)
- [Continuous integration](#continuous-integration)
- [Out of scope](#out-of-scope)

## Running the suite

The suite needs PostgreSQL running and the schema applied. It does not need seed data, because it creates everything it uses. If no development server is listening on port 3000, Playwright starts one and stops it at the end. If one is already running, Playwright reuses it.

```bash
npm run test:e2e            # every test, both device projects
npm run test:e2e:ui         # the Playwright UI, for writing and debugging tests
npm run test:e2e:smoke      # the 10 tests tagged @smoke, about 15 seconds
npm run test:e2e:security   # permission, isolation and rate-limit tests
npm run test:e2e:a11y       # the accessibility scans
npm run test:e2e:report     # open the HTML report of the last run
```

A full run takes about one minute on four workers.

To run one file, one test, or one browser project:

```bash
npx playwright test e2e/specs/queue.spec.ts
npx playwright test -g "an agent takes a ticket for themselves"
npx playwright test --project=mobile-chrome
```

Do not use `--grep` to select a tag. The setup projects have no tags, so `--grep` hides them, and every test then fails because it has no fixture data and no session cookie. Use the `E2E_TAG` environment variable instead, which the configuration applies as a per-project filter:

```bash
E2E_TAG=@security npx playwright test
```

## Design decisions

Each decision below states what the suite does, why, and what it costs.

### 1. Every run provisions its own teams

The suite creates two teams and one platform super user under a namespace that is unique to the run, for example `e2emtmty957y5vw-alpha`. Each team gets six accounts, one per role and requester type, and two categories.

The reason is that the development database is shared with other work. An earlier version of this suite deleted rows to return the seed data to a known state before each run, which destroyed whatever a developer was looking at. Provisioning instead of resetting means the suite never writes to a row it did not create.

The cost is about 400 ms at the start of each run, and the rule that no assertion may refer to seed data.

### 2. Every test owns its rows

The `factory` fixture creates tickets, users and categories for one test and deletes them after that test ends, even when the test fails. Subjects are stamped with the Playwright test id, so two tests can never search for each other's data.

The reason is parallel execution. Four workers share one database, so a test that asserted on the total contents of a list would fail whenever another test added a row. The rule that follows is: assert that your own row is present or absent, never that a list has a given length.

The cost is that a test must create its starting state explicitly, which makes tests longer to read but removes any shared setup that a reader has to go and find.

### 3. Sign in once per role, not once per test

The `auth` project signs in as each of the seven accounts one time and saves each session cookie to a file. Every test then starts with `test.use({ storageState: STATE.alphaSupport })` and is already signed in.

The reason is speed and safety. A sign-in costs about 1.5 seconds because bcrypt is deliberately slow, and 149 sign-ins would dominate the run. It also keeps the fixture accounts clear of the login rate limiter, which refuses an email after five attempts in fifteen minutes.

The cost is that the sign-in form itself needs its own tests, which live in `login.spec.ts` and run without a stored session.

### 4. Page objects hold the selectors, tests hold the intent

Every page has one class in [`e2e/pages`](../e2e/pages) that exposes locators and short actions such as `moveTo("RESOLVED")` or `searchFor("visa")`. Specs contain no CSS selectors.

The reason is that a change to the markup should break one line in one class, not thirty assertions. It also makes a test readable by someone who does not know the codebase.

### 5. Confirm a write by the server's answer, not by the control you just used

Reading back the control that was just set proves nothing, because optimistic updates change it before the server replies. Status changes are confirmed by the success message the server action returns. Assignment and priority have no success message at all, so those tests read the row back from the database with `expect.poll`.

The reason is that a test which cannot tell an accepted write from a rejected one is worse than no test.

### 6. Wait for a state, never for a duration

The suite contains no fixed waits. The search box, for example, delays 300 ms before it writes the query into the URL, so the page object waits for the URL to carry the committed query. Comment posting waits for the posted comment to appear.

The reason is that a fixed wait is either too short, which makes the test flaky, or too long, which makes the suite slow. Usually both, on different machines.

Two places need more than a wait. React clears an uncontrolled form once the action it was given finishes, and that clearing can arrive while a page object is still typing into the form. The sign-in helper and the comment helper therefore type inside `expect(...).toPass()`, which types again if the field was emptied. A sign-in also needs the response itself: every refused attempt renders the same sentence, so only the answer to the POST tells one attempt apart from the one before it.

### 7. Two device projects, not five

Every test runs on desktop Chrome. Only the tests tagged `@responsive` or `@a11y` also run on an emulated Pixel 7, because those are the only risks that depend on screen size.

The reason is that running the whole suite on a second device would double the run time and test the same server code twice. Cross-browser coverage is a separate question that belongs in continuous integration, not in the local loop.

### 8. Known defects are recorded as tests, not as comments

A defect the team has decided not to fix yet is marked with `test.fail()`, which passes while the defect is present and fails on the day it is fixed. Accessibility rules the product currently fails are excluded from the page scans by name, and a separate test asserts each excluded rule is still failing.

The reason is that a defect written in a comment is forgotten, and an exclusion with no expiry becomes permanent. Both mechanisms force a review as soon as the situation changes.

## The project graph

Playwright projects run in this order, and each one depends on the one before it.

| Project         | What it does                                                                        | Runs on          |
| --------------- | ----------------------------------------------------------------------------------- | ---------------- |
| `provision`     | Removes abandoned fixture data, then creates this run's teams, users and categories | Node, no browser |
| `auth`          | Signs in as each role, saves seven session files, and requests every route once     | Desktop Chrome   |
| `chromium`      | Every spec in `e2e/specs`                                                           | Desktop Chrome   |
| `mobile-chrome` | Only the specs tagged `@responsive` or `@a11y`                                      | Emulated Pixel 7 |
| `cleanup`       | Deletes the run's namespace                                                         | Node, no browser |

`cleanup` is declared as the `teardown` of `provision`, so Playwright runs it after everything else finishes, including after a failing run.

The `auth` project also requests each route once while nothing is being measured. The development server compiles a route the first time it is asked for, and that cost, up to several seconds for the ticket pages, would otherwise land inside the timeout of whichever test reached the route first.

## Test data

Two teams exist because tenant isolation is the highest risk in the product, and proving that team A cannot see team B needs a real team B. They are named `alpha` and `bravo`.

Each team has six accounts:

| Key               | Role                      | Purpose                                              |
| ----------------- | ------------------------- | ---------------------------------------------------- |
| `requester`       | Requester, customer type  | The default author of a ticket                       |
| `secondRequester` | Requester, recruiter type | Proves a requester cannot see a colleague's ticket   |
| `support`         | Support                   | The default agent                                    |
| `secondSupport`   | Support                   | Proves an agent may not assign work to another agent |
| `manager`         | Manager                   | Escalation, reopening, assignment to others          |
| `admin`           | Admin                     | Role administration and the assignment ceiling       |

One super user exists outside both teams, because the platform pages are reachable only without a team.

Tests that change a user, such as the role administration tests, do not use these six accounts. They call `factory.user()`, which creates a throwaway account and deletes it afterwards. If they changed a shared account, the account would carry the change into every later test.

## Coverage

The suite is organised by risk, not by page. The order below is the order of the harm each failure would cause.

| Risk                                                       | Tests | File                       |
| ---------------------------------------------------------- | ----- | -------------------------- |
| A team reads another team's data                           | 5     | `tenant-isolation.spec.ts` |
| A role reaches a page it must not                          | 55    | `route-guards.spec.ts`     |
| A requester reads an internal note or a colleague's ticket | 4     | `visibility.spec.ts`       |
| A role performs a status change above its level            | 7     | `ticket-workflow.spec.ts`  |
| An account is promoted above the promoter's ceiling        | 6     | `admin.spec.ts`            |
| Credentials are guessed by repeated attempts               | 1     | `rate-limit.spec.ts`       |
| Sign-in accepts or refuses the wrong people                | 9     | `login.spec.ts`            |
| Work is assigned to the wrong person                       | 6     | `assignment.spec.ts`       |
| An agent cannot find a ticket                              | 7     | `queue.spec.ts`            |
| A requester cannot file or answer a ticket                 | 6     | `portal.spec.ts`           |
| The product is unusable with a screen reader or a keyboard | 10    | `a11y.spec.ts`             |
| The product is unusable on a phone                         | 6     | `responsive.spec.ts`       |
| A workspace does not load at all                           | 7     | `smoke.spec.ts`            |

The route guard table deserves a note. It is generated from one matrix of six roles against nine paths, so adding a route to the product means adding one row and the suite immediately checks it for every role, in both directions: the roles that must reach it and the roles that must not.

## Safety on a shared database

The database container is shared with local development and with other projects, so the suite treats it as if it belonged to someone else.

- The suite never issues an unscoped delete. Every delete names either an id it created or a team slug that starts with its own namespace.
- Fixture teams are always named with the prefix `e2e`, which is what makes them identifiable.
- Deleting the team cascades to its users, tickets, comments, status events and attachments, so one delete removes the whole run.
- A run that is killed before its teardown leaves its teams behind. The next run's `provision` step deletes any fixture team older than two hours. Two hours is longer than any run, so a sweep can never delete data belonging to a run that is still in progress.
- The suite writes nothing outside the database except the session files in `e2e/.artifacts`, which the teardown removes.

## Tags

Tags describe what a test protects, so a slice of the suite can be run against a change that only touches one area. Select a tag with `E2E_TAG`, for example `E2E_TAG=@security npm run test:e2e`. The variable sets a `grep` on each device project rather than on the command line, because `--grep` would also hide the setup projects that every test depends on.

| Tag           | Tests | When to run it                                                                                           |
| ------------- | ----- | -------------------------------------------------------------------------------------------------------- |
| `@smoke`      | 10    | Before a commit. It proves every role can reach its workspace, and that a ticket can be filed and found. |
| `@security`   | 65    | After any change to authentication, to the route guards, or to a service function.                       |
| `@a11y`       | 10    | After a change to markup or to the design tokens.                                                        |
| `@responsive` | 6     | After a change to layout or to the navigation.                                                           |

The counts are per device project. The phone project carries only `@a11y` and `@responsive`, because a phone cannot fail a permission rule differently from a laptop. A selected tag is intersected with that pair rather than replacing it, so `E2E_TAG=@a11y` runs the ten accessibility tests on both projects, while `E2E_TAG=@security` runs sixty five tests on the desktop project and leaves the phone project empty.

Untagged tests are feature tests. They run in the full suite only.

## Known defects

Each defect below is recorded in the suite, so the suite fails when the defect is fixed and the record has to be removed.

### The demo sign-in leaves the visitor on the marketing page

The sign-in action redirects to `/`. The guard that forwards a signed-in visitor to their own workspace does not run on that client-side navigation, so the visitor stays on the marketing page until they reload. Recorded by a `test.fail()` test in `login.spec.ts`.

### Subtle text does not meet the contrast requirement

The `--fg-subtle` token is `#9a9585`, which gives a contrast ratio of 2.85:1 against the page background. WCAG 2.1 AA requires 4.5:1 for normal text. The token is used for table headers, timestamps, hints and placeholder rows across the admin area, the queue and the portal, so this is one fix in `globals.css` and not a fix per page. Darkening it to `#767060` reaches 4.7:1. The change is visual, so it is recorded rather than applied. The rule `color-contrast` is excluded from the page scans, and one test asserts it is still failing.

### One link is marked by color alone

The "Sign in differently?" link on the sign-in page differs from the text around it only by color, which fails the rule for readers who cannot see that difference. An underline fixes it. The rule `link-in-text-block` is excluded from the page scans, and one test asserts it is still failing.

### A shared demo account locks itself for every visitor

`demoLoginAction` passes the demo address through the same limiter as the credentials form, and that limiter counts successful sign-ins as well as failed ones. Five demo sign-ins as the same role within fifteen minutes therefore lock that demo account, and the counter is one map in one server process, so the lock applies to every visitor at once. On a public demo this means five people can sign in as Manager in a quarter of an hour and the sixth is refused. A limiter that skips demo accounts, or one that keys on the address of the caller as well as the email, would fix it. The two demo sign-in tests in `login.spec.ts` skip themselves when they meet the lock, rather than report a broken button.

### The comment form discards anything typed before hydration

`DeskCommentForm` calls `reset()` inside an effect whose dependencies also make it run once on mount. A real user who begins typing before the page finishes hydrating loses what they typed. The page object works around it by entering the comment inside a retry block, which is why `postComment` is written the way it is.

## Continuous integration

The `e2e` job in [`ci.yml`](../.github/workflows/ci.yml) runs the suite against a production build, with PostgreSQL as a service container, split across two shards that run in parallel. Each shard uploads a blob report, and a final job merges the shards into one HTML report and uploads it as an artifact. The report is kept for seven days.

Two settings differ from a local run. `forbidOnly` fails the run if a `test.only` was committed, and each test is retried twice before it is reported as failed. A test that passes on a retry is reported as flaky, which keeps flakiness visible instead of hiding it.

## Out of scope

These are deliberate gaps, listed so that nobody assumes they are covered.

- **Other browsers.** The suite runs on Chromium only. Firefox and WebKit would triple the run time for a product whose risk is in its server-side permission rules, not in its CSS.
- **Visual regression.** No screenshot comparison. It is the most common source of false failures, and the product has no visual identity worth pinning yet.
- **Load and performance.** Nothing here measures how the product behaves under concurrent users.
- **Email.** The product sends none.
- **File upload through the interface.** Attachments are created directly in the database for the download tests. Uploading through the picker is covered by unit tests of the compression pipeline.
