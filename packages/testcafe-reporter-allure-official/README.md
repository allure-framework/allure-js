# Allure TestCafe

> Allure Framework integration for [TestCafe](https://testcafe.io)

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- 📚 [Documentation](https://allurereport.org/docs/) - discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) - get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) - be in touch with the latest updates
- 💬 [General Discussion](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) - engage in casual conversations, share insights and ideas with the community

---

`testcafe-reporter-allure-official` adds [Allure Report](https://allurereport.org/) support to TestCafe. It writes `allure-results`, captures TestCafe actions as steps, and works with the standard `allure-js-commons` runtime API.

## Features

- writes standard Allure results from TestCafe runs
- captures built-in TestCafe actions and assertions such as `click`, `typeText`, and `expect(...).eql(...)` as Allure steps
- supports standard runtime API imports from `allure-js-commons`
- supports labels, links, descriptions, parameters, attachments, and nested steps
- supports `fixture.meta(...)`, `test.meta(...)`, and inline `@allure.*` title annotations
- attaches screenshots, videos, warnings, quarantine details, and execution details
- supports Allure test plans in JS/CJS TestCafe config files and the runner API

## Installation

Install the reporter:

```shell
npm install -D testcafe-reporter-allure-official
```

Install an Allure CLI to build and open the report:

- Allure Report 2: [installation guide](https://allurereport.org/docs/install/)
- Allure Report 3:

```shell
npm install -D allure
```

## Requirements

- `testcafe >= 2.5.0`

## Recommended setup

Keep Allure test plan filtering enabled in every JS/CJS config or runner setup:

- it is recommended for Allure 3 smart retries
- it is recommended for agent-mode workflows
- the helper is safe to leave enabled permanently

If `ALLURE_TESTPLAN_PATH` is not set, `createAllureTestPlanFilter()` returns `undefined` and TestCafe runs normally.

Create a `.testcaferc.cjs` file:

```js
const { createAllureTestPlanFilter } = require("testcafe-reporter-allure-official/testplan");

module.exports = {
  src: ["tests/**/*.test.js"],
  browsers: ["chromium:headless --guest"],
  reporter: ["spec", "allure-official"],
  filter: createAllureTestPlanFilter(),
};
```

Run TestCafe with that config:

```shell
testcafe --config-file .testcaferc.cjs
```

This creates results in `./allure-results`.

Generate and open the report:

```shell
allure generate ./allure-results -o ./allure-report
allure open ./allure-report
```

Or with Allure Report 3:

```shell
npx allure generate ./allure-results
npx allure open ./allure-report
```

## Direct CLI usage

For one-off local runs, you can still start TestCafe directly:

```shell
testcafe "chromium:headless --guest" tests -r spec,allure-official
```

If you want test plan support, prefer running through a JS/CJS config file or the runner API so `createAllureTestPlanFilter()` stays enabled.

## Configuration file usage

Use the reporter by name and keep test plan filtering configured:

```js
const { createAllureTestPlanFilter } = require("testcafe-reporter-allure-official/testplan");

module.exports = {
  src: ["tests/**/*.test.js"],
  browsers: ["chromium:headless --guest"],
  reporter: ["spec", "allure-official"],
  filter: createAllureTestPlanFilter(),
};
```

JSON config files cannot use function-based filters. For the recommended Allure setup, use `.testcaferc.js`, `.testcaferc.cjs`, or the runner API.

## Runner API usage

Use the runner API when you want to customize the output directory or reporter options while keeping test plan support enabled:

```js
const createTestCafe = require("testcafe");
const createAllureTestCafeReporter = require("testcafe-reporter-allure-official");
const { createAllureTestPlanFilter } = require("testcafe-reporter-allure-official/testplan");

(async () => {
  const testcafe = await createTestCafe();

  try {
    const runner = testcafe.createRunner();

    await runner
      .src(["tests/**/*.test.js"])
      .browsers(["chromium:headless --guest"])
      .filter(createAllureTestPlanFilter())
      .reporter(
        createAllureTestCafeReporter({
          resultsDir: "./out/allure-results",
          links: {
            issue: {
              urlTemplate: "https://issues.example.com/%s",
              nameTemplate: "ISSUE-%s",
            },
          },
          globalLabels: [
            {
              name: "component",
              value: "web",
            },
          ],
          environmentInfo: {
            target: "staging",
          },
        }),
      )
      .run();
  } finally {
    await testcafe.close();
  }
})();
```

Available options:

- `resultsDir`
- `captureActionsAsSteps`
- `links`
- `globalLabels`
- `environmentInfo`
- `categories`

## Runtime API

Once the Allure reporter is enabled, you can use standard imports from `allure-js-commons` inside your tests:

```js
const { attachment, owner, severity, step } = require("allure-js-commons");

fixture`Authentication`.page`https://example.com/login`;

test("sign in", async (t) => {
  await owner("alice");
  await severity("critical");

  await step("Submit credentials", async (ctx) => {
    await ctx.parameter("login", "demo-user");
    await attachment("payload.json", JSON.stringify({ login: "demo-user" }), "application/json");

    await t.typeText("#login", "demo-user").typeText("#password", "secret").click("#submit");
  });
});
```

## Automatic action steps

The reporter captures common TestCafe actions and assertions as steps automatically, including:

- `t.click(...)`
- `t.typeText(...)`
- `t.pressKey(...)`
- `t.navigateTo(...)`
- `t.request(...)`
- `t.takeScreenshot(...)`
- `t.expect(...).eql(...)`
- `t.expect(...).ok()`

If you want to keep only explicit runtime API steps, disable automatic action capture:

```js
createAllureTestCafeReporter({
  captureActionsAsSteps: false,
});
```

## Metadata

You can add Allure metadata through `meta(...)`:

```js
fixture`Checkout`.meta({
  "allure.label.epic": "Storefront",
  "allure.label.feature": "Checkout",
});

test.meta({
  "allure.id": "42",
  "allure.label.story": "Pay with card",
  "allure.link.issue": "PAY-42",
})("pay with card", async (t) => {
  await t.expect(true).ok();
});
```

You can also add inline title annotations:

```js
test("pay with card @allure.id=42 @allure.label.tag=smoke", async (t) => {
  await t.expect(true).ok();
});
```

## Test plan support

Allure test plans are recommended for everyday TestCafe setup. Keep the filter helper configured in your JS/CJS config or runner API, and control selection by setting `ALLURE_TESTPLAN_PATH`.

Create an Allure test plan file:

```json
{
  "version": "1.0",
  "tests": [
    {
      "selector": "tests/auth.test.js#Authentication#sign in"
    },
    {
      "id": "42"
    }
  ]
}
```

Set `ALLURE_TESTPLAN_PATH`, then use the helper in a JS/CJS config:

```js
const { createAllureTestPlanFilter } = require("testcafe-reporter-allure-official/testplan");

module.exports = {
  src: ["tests/**/*.test.js"],
  browsers: ["chromium:headless --guest"],
  reporter: ["allure-official"],
  filter: createAllureTestPlanFilter(),
};
```

Or with the runner API:

```js
const { createAllureTestPlanFilter } = require("testcafe-reporter-allure-official/testplan");

await runner.src(["tests/**/*.test.js"]).filter(createAllureTestPlanFilter()).reporter("allure-official").run();
```

## Result artifacts

Depending on your TestCafe setup, the reporter can include:

- screenshots
- recorded videos
- warnings
- quarantine information
- browser information
- execution log attachments

## Example

```js
const { epic, feature, story, step } = require("allure-js-commons");
const { Selector } = require("testcafe");

fixture`Orders`.page`https://example.com/orders`;

test("create order", async (t) => {
  await epic("Storefront");
  await feature("Orders");
  await story("Create order");

  await step("Open creation form", async () => {
    await t.click("[data-test=create-order]");
  });

  await step("Submit order", async () => {
    await t.typeText("#name", "Sample order").click("#save");
  });

  await t.expect(Selector("[data-test=success]").exists).ok();
});
```
