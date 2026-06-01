# allure-ava

> Allure framework integration for the [AVA](https://avajs.dev/) test runner

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- Documentation is available at https://allurereport.org/docs/
- Questions and support are available at https://github.com/orgs/allure-framework/discussions/categories/questions-support

## Features

- writes Allure results from AVA runs
- supports passed, failed, skipped, and todo tests
- supports labels, links, parameters, steps, and attachments through `allure-js-commons`
- supports Allure test-plan filtering through `ALLURE_TESTPLAN_PATH`
- works with Allure Report 2 and Allure Report 3

## Installation

Install `allure-ava` and AVA using a package manager of your choice. For example:

```shell
npm install -D allure-ava ava
```

Install Allure Report separately when you want to render the generated `allure-results`:

- follow the [Allure Report 2 installation guide](https://allurereport.org/docs/install/) to use the `allure` CLI
- or install Allure Report 3 with `npm install -D allure` to use `npx allure`

## Supported versions and platforms

- `ava >= 8.0.0`
- Linux, macOS, and Windows wherever AVA supports Node.js
- Node.js versions supported by your AVA version. AVA 8 requires Node.js `^22.20`, `^24.12`, or `>=26`.

## Usage

Call `installAllure()` from your AVA configuration file:

```js
// ava.config.mjs
import { installAllure } from "allure-ava";

await installAllure({
  resultsDir: "allure-results",
});

export default {};
```

Then run AVA normally:

```bash
npx ava
```

If you use a CommonJS config file, export an async factory:

```js
// ava.config.cjs
module.exports = async () => {
  const { installAllure } = await import("allure-ava");

  await installAllure({
    resultsDir: "allure-results",
  });

  return {};
};
```

You can still pass regular AVA CLI arguments:

```bash
npx ava test/**/*.test.js --match "signing in"
```

When the test run completes, the result files will be generated in the `./allure-results` directory.

### Configuration

Pass common reporter configuration to `installAllure()` from the AVA config file:

```js
import { installAllure } from "allure-ava";

await installAllure({
  resultsDir: "./out/allure-results",
  globalLabels: {
    layer: "api",
  },
});

export default {};
```

## Allure API

Enhance the report by using the runtime API from `allure-js-commons`:

```js
import test from "ava";
import { attachment, label, step } from "allure-js-commons";

test("signs in with a password", async (t) => {
  await label("severity", "critical");

  await step("submit credentials", async () => {
    await attachment("request", JSON.stringify({ username: "jdoe" }), {
      contentType: "application/json",
    });
  });

  t.pass();
});
```

### Sync API

When your test code uses synchronous helpers or matcher integrations, you can use the sync facade from `allure-js-commons/sync`.

```js
import * as allure from "allure-js-commons/sync";

allure.step("check result", () => {
  allure.parameter("mode", "sync");
});
```

The sync facade is strict-sync only: `allure.step()` must finish synchronously and must not return a `Promise`.

## Test plan

When `ALLURE_TESTPLAN_PATH` points to a TestOps test-plan JSON file, the integration deselects non-matching AVA tests
before execution. Entries can match by Allure ID from `@allure.id=...` title metadata or by selector in the
`path/to/file.test.js#test title` form. Selector titles use the cleaned AVA title, so Allure title metadata is stripped
before matching.

## Implementation notes

AVA does not provide a stable reporter extension point for emitting structured per-test lifecycle data. This integration
therefore patches AVA at runtime:

- in the main process, `installAllure()` wraps `Api.prototype.run` so the Allure reporter can subscribe to AVA state
  changes
- in worker processes, `Runner.prototype.runSingle` is wrapped so `allure-js-commons` runtime calls are scoped to the
  currently running test with `AsyncLocalStorage`
- when a test plan is present, `Runner.prototype.start` is wrapped to deselect non-matching tests after AVA has registered
  them and before AVA emits `selected-test` or runs user code
- runtime API messages are sent through AVA's existing worker channel and ignored by AVA itself

The patched surface is intentionally narrow and covered by integration tests against AVA 8.

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
