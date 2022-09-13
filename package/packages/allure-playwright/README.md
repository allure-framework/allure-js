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
  reporter: [['line'], ['allure-playwright']]
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
|--------------|------------------------------------------------------------------------------|--------------------|
| outputFolder | Path to results folder.                                                      | `./allure-results` |
| detail       | Hide `pw:api` and `hooks` steps in report. [See below](#hooks-and-api-calls) | `true`             |
| suiteTitle   | Use test title instead of `allure.suite()`. [See below](#suit-title)         | `true`             |

### Options Usage

```js
const config = {
  reporter: [['allure-playwright', {
    detail: true,
    outputFolder: 'my-allure-results',
    suiteTitle: false
  }]],
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
import { allure, LabelName } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
    allure.label({ name: LabelName.LANGUAGE, value: "typescript" });
});
```
### Links Usage

```js
import { test, expect } from "@playwright/test";
import { allure } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
  allure.link({ url: "https://playwright.dev", name: "playwright-site" });
  allure.issue({
    url: "https://github.com/allure-framework/allure-js/issues/352",
    name: "Target issue",
  });
});
```

### Id Usage

```js
import { test, expect } from "@playwright/test";
import { allure, LabelName } from "allure-playwright";

test("basic test", async ({ page }, testInfo) => {
    allure.id("Some id");
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

export const TODO_ITEMS = [
  "buy some cheese",
  "feed the cat",
  "book a doctors appointment",
];

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

export const TODO_ITEMS = [
  "buy some cheese", 
  "feed the cat", 
  "book a doctors appointment"
];

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
