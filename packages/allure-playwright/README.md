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

or inside the config via:

```js
const config = {
  reporter: [ ['allure-playwright', { outputFolder: 'my-allure-results' }] ],
};
```

Generate Allure Report:
```bash
allure generate my-allure-results -o allure-report --clean
```

Open Allure Report:
```bash
allure open allure-report
```

## Proving extra information

You can use allure labels to provide extra information about tests such via

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



### Attachments Usage

```js
import { test, expect } from "@playwright/test";

test("basic test", async ({ page }, testInfo) => {
  const path = testInfo.outputPath("screenshot.png");
  await page.screenshot({ path });
  testInfo.attachments.push({ name: "screenshot", path, contentType: "image/png" });
});
```
