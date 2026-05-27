# allure-node-test

> Allure framework integration for the native Node.js test runner.

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- Documentation is available at https://allurereport.org/docs/
- Questions and support are available at https://github.com/orgs/allure-framework/discussions/categories/questions-support

## Installation

Install `allure-node-test` using a package manager of your choice. For example:

```shell
npm install -D allure-node-test allure-js-commons
```

Keep `allure-node-test` and `allure-js-commons` on the same version.

## Usage

Use the Node.js test reporter and preload the setup module:

```shell
node --test --import allure-node-test/setup --test-reporter allure-node-test/reporter
```

Keep test imports unchanged:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { label, step } from "allure-js-commons";

test("signing in", async () => {
  await label("severity", "critical");
  await step("submit form", async () => {});

  assert.equal(1 + 1, 2);
});
```

Full runtime API support with unchanged `node:test` imports requires Node.js 26.1 or newer. On older Node.js versions,
you can still use `allure-node-test/reporter` without the setup preload for basic pass, fail, skip, and todo results:

```shell
node --test --test-reporter allure-node-test/reporter
```

If `ALLURE_TESTPLAN_PATH` is set, the setup preload may also be used on older Node.js versions to filter test execution,
but runtime API calls still require Node.js 26.1 or newer.

When the test run completes, the result files will be generated in the `./allure-results` directory.

## Complete example

Install the integration and the shared Allure runtime API:

```shell
npm install -D allure-node-test allure-js-commons
```

If you want to generate the report with the Allure Report 3 npm package, install it too:

```shell
npm install -D allure
```

Add npm scripts:

```json
{
  "scripts": {
    "test:allure": "node --test --import allure-node-test/setup --test-reporter allure-node-test/reporter",
    "report:allure": "allure generate ./allure-results -o ./allure-report --clean",
    "open:allure": "allure open ./allure-report"
  }
}
```

Create a test that keeps the native Node.js test imports and uses `allure-js-commons` only for reporting metadata:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { attachment, label, link, parameter, step } from "allure-js-commons";

test("signs in @allure.id:AUTH-1", async () => {
  await label("feature", "Authentication");
  await label("severity", "critical");
  await link("https://example.com/docs/auth", "Auth documentation", "doc");
  await parameter("browser", "chromium");

  await step("submit credentials", async () => {
    const response = { status: 200, body: { userId: "user-1" } };

    await attachment("response", JSON.stringify(response, null, 2), "application/json");

    assert.equal(response.status, 200);
  });
});
```

Run the tests and open the report:

```shell
npm run test:allure
npm run report:allure
npm run open:allure
```

Configure output and common report metadata with environment variables:

```shell
ALLURE_RESULTS_DIR=./out/allure-results \
ALLURE_NODE_TEST_CONFIG='{"environmentInfo":{"node":"26"},"globalLabels":{"layer":"api"}}' \
node --test --import allure-node-test/setup --test-reporter allure-node-test/reporter
```

## Sync API

When your Node.js tests use synchronous helpers or matcher integrations, you can use the sync facade from
`allure-js-commons/sync`.

```ts
import * as allure from "allure-js-commons/sync";

allure.step("check result", () => {
  allure.parameter("mode", "sync");
});
```

The sync facade is strict-sync only: `allure.step()` must finish synchronously and must not return a `Promise`.

## Configuration

Set `ALLURE_RESULTS_DIR` to change the output directory:

```shell
ALLURE_RESULTS_DIR=out/allure-results node --test \
  --import allure-node-test/setup \
  --test-reporter allure-node-test/reporter
```

Use `ALLURE_NODE_TEST_CONFIG` for the common Allure reporter configuration fields that can be represented as JSON:

```shell
ALLURE_NODE_TEST_CONFIG='{"globalLabels":{"layer":"api"},"environmentInfo":{"runtime":"node"}}' \
  node --test --import allure-node-test/setup --test-reporter allure-node-test/reporter
```

Supported JSON configuration fields include:

- `resultsDir`
- `environmentInfo`
- `categories`
- `globalLabels`
- `links` with string templates

Set `ALLURE_TESTPLAN_PATH` to point to an Allure test plan file. With `--import allure-node-test/setup`, the integration
patches `node:test` registration so tests outside the plan are registered as skipped before their bodies execute. Those
internal skip registrations are omitted from `allure-results`.

Reporter-only mode does not filter execution. If tests run, the reporter writes them to Allure even when
`ALLURE_TESTPLAN_PATH` is present.

Native `t.test()` subtests are treated as part of the parent test's execution boundary. If a test plan selector points
to a subtest, `allure-node-test/setup` runs the parent test and lets Node execute the subtests the parent registers.
Every test and subtest that actually runs is reported to Allure. Subtest-only selection by Allure ID cannot be expanded
before execution unless the parent can also be identified from the selector.

Listener functions are not supported through CLI configuration because Node.js does not pass an option object to custom
test reporters.

## Notes

- `allure-node-test/setup` uses Node.js `getTestContext()` and `diagnostics_channel` test instrumentation.
- Native `describe()` and `it()` suites are mapped to Allure suite labels and title paths.
- Native Node.js test tags are mapped to Allure `tag` labels when the running Node.js version exposes them.
- Runtime API calls from hooks are attached to the active Node.js test when Node exposes that context. Failed native hooks
  reported by Node.js are preserved as Allure fixture containers and run-level global errors.
- Per-test stdout and stderr attachments require a Node reporter event with `testId`; output without a `testId` is
  written as global run output.
- To keep a console reporter alongside Allure, configure multiple Node.js test reporters and destinations with the Node
  CLI.

## View the report

Use Allure Report 2:

```bash
allure generate ./allure-results -o ./allure-report
allure open ./allure-report
```

Or use Allure Report 3:

```bash
npx allure generate ./allure-results
npx allure open ./allure-report
```
