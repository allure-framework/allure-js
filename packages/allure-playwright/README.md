# allure-playwright

This project implements Allure integration with [Playwright Test](https://playwright.dev) framework.

## Installation

```bash
npm i -D @playwright/test allure-playwright
```

or via yarn:

```bash
yarn add @playwright/test allure-playwright --dev
```

## Usage

Either add **allure-playwright** into **playwright.config.ts**:

```js
{
  reporter: "allure-playwright";
}
```

Or pass the same value via config file:

```js
{
  reporter: [["line"], ["allure-playwright"]];
}
```

Or pass the same value via command line:

```bash
npx playwright test --reporter=line,allure-playwright
```

Specify location for allure results:

Mac / Linux

```bash
ALLURE_RESULTS_DIR=my-allure-results npx playwright test --reporter=line,allure-playwright
```

Windows

```bash
set ALLURE_RESULTS_DIR=my-allure-results
npx playwright test --reporter=line,allure-playwright
```

Generate Allure Report:

```bash
allure generate my-allure-results -o allure-report --clean
```

Open Allure Report:

```bash
allure open allure-report
```

## Reporter options

Some reporter settings can set by following options:

| Option       | Description                                                                  | Default            |
| ------------ | ---------------------------------------------------------------------------- | ------------------ |
| outputFolder | Path to results folder.                                                      | `./allure-results` |
| detail       | Hide `pw:api` and `hooks` steps in report. [See below](#hooks-and-api-calls) | `true`             |
| suiteTitle   | Use test title instead of `allure.suite()`. [See below](#suit-title)         | `true`             |

### Options Usage

```js
const config = {
  reporter: [
    [
      "allure-playwright",
      {
        detail: true,
        outputFolder: "my-allure-results",
        suiteTitle: false,
      },
    ],
  ],
};
```

### Options for Allure TestOps compatibility

After exporting test results into Allure TestOps, the results may contain extra steps with Playwright’s API calls, as
well as collisions in the name of the suits.

#### Hooks and API calls

By default, each step of the `test.step()` functions contains subsections Playwright’s API methods calls.

The report looks like:

```text
> Before Hooks
  > browserContext.newPage

> Open example.com
  > page.goto( https://example.com/)

> Expect page text
  > expect.toBeVisible

> After Hooks
  > browserContext.close
```

To hide steps with `Before / After hooks` and API calls `page / expect / browser` set the option `detail: false`

#### Suit title

By default, the reporter uses the test file path as the suite name.

If tests uses the `allure.suite()` and it's value must be used in Allure TestOps custom fields, then set the option `suiteTitle: false`

## Proving extra information

Tests extra information can be provided by labels:

- label
- link
- id
- epic
- feature
- story
- suite
- parentSuite
- subSuite
- owner
- severity
- tag
- issue
- tms

### Labels Usage

```js
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.label("labelName", "labelValue");
});
```

### Links Usage

```js
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.link("https://playwright.dev", "playwright-site"); // link with name
  allure.issue("Issue Name", "https://github.com/allure-framework/allure-js/issues/352");
});
```

### Id Usage

```js
import { test, expect } from "@playwright/test";
import { allure, LabelName } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.id("420");
});
```

### Epics Usage

```js
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.epic("Some Epic");
});
```

### Stories Usage

```js
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.story("Some Story");
});
```

### Screenshot usage

```ts
test("basic test", async ({ page }, testInfo) => {
  await testInfo.attach("basic-page-screen", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
});
```

### Attachments Usage

```js
import { test, expect } from "@playwright/test";

export const TODO_ITEMS = ["buy some cheese", "feed the cat", "book a doctors appointment"];

test("basic test", async ({ page }, testInfo) => {
  await testInfo.attach("TODO_ITEMS", {
    body: JSON.stringify(TODO_ITEMS),
    contentType: "application/json",
  });
});
```

### Steps usage

```ts
import { test, expect } from "@playwright/test";

export const TODO_ITEMS = ["buy some cheese", "feed the cat", "book a doctors appointment"];

test("basic test", async ({ page }, testInfo) => {
  await test.step("Visit todolist page", async () => {
    await page.goto("https://demo.playwright.dev/todomvc");
  });

  await test.step("Create 1st todo.", async () => {
    await page.locator(".new-todo").fill(TODO_ITEMS[0]);
    await page.locator(".new-todo").press("Enter");
  });

  await expect(
    page.locator(".view label"),
    "Make sure the list only has one todo item.",
  ).toHaveText([TODO_ITEMS[0]]);
});
```

### Parameters usage

```ts
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.parameter("parameterName", "parameterValue");
});
```

Also parameter takes an third optional parameter with the hidden and excluded options:
`mode: "hidden" | "masked"` - `masked` hide parameter value to secure sensitive data, and `hidden` entirely hide parameter from report

`excluded: true` - excludes parameter from the history

```ts
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.addParameter("parameterName", "parameterValue", { mode: "masked", excluded: true });
});
```

### Selective test execution

Allure allow you to execute only a subset of tests. This is useful when you want to run only a specific test or a group of tests.

To enable this feature, you need to add the following code to your `playwright.config.js`:

```diff
+ import { testPlanFilter } from "allure-playwright/dist/testplan";
export default {
  reporter: [
    [
      "allure-playwright",
    ],
  ],
  projects: [
    {
      name: "chromium",
    },
  ],
+  grep: testPlanFilter()
};
```

Allure will read `ALLURE_TESTPLAN_PATH` environment variable and read testplan from the specified file.

### EnvironmentInfo usage

Allure allows you to add environment information to the report. This is useful when you want to add some additional information to the report.

to enable this feature, you need to add the following field to your `playwright.config.js`:

```diff
export default {
  reporter: [
    [
      "allure-playwright",
      {
+        environmentInfo: {
+          E2E_NODE_VERSION: process.version,
+          E2E_OS: process.platform,
+        },
      },
    ],
  ],
};
```

### Visual comparisons usage

Allure allows you to add visual comparisons to the report. This is useful when you want to add some additional information to the report.

```ts
import { test, expect } from "@playwright/test";
test("screendiff", async ({ page }) => {
  await page.goto("https://playwright.dev/");
  await expect(page).toHaveScreenshot();
});
```

If screenshots don't match, the report shows difference between them.

![screendiff-preview](./docs/screendiff.jpg)
