# allure-bun

> Allure framework integration for Bun test

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- Documentation is available at https://allurereport.org/docs/
- Questions and support are available at https://github.com/orgs/allure-framework/discussions/categories/questions-support

## Installation

Install `allure-bun` using a package manager of your choice. For example:

```shell
npm install -D allure-bun allure-js-commons
```

Keep `allure-bun` and `allure-js-commons` on the same version.

## Usage

Bun support is provided through Bun's documented preload hook. Keep your test imports unchanged and preload `allure-bun/setup` from `bunfig.toml`:

```toml
[test]
preload = ["allure-bun/setup"]
```

Example:

```ts
import { describe, expect, it } from "bun:test";
import { label, step } from "allure-js-commons";

describe("signing in", () => {
  it("works", async () => {
    await label("severity", "critical");
    await step("submit form", async () => {});

    expect(1 + 1).toBe(2);
  });
});
```

### Sync API

When your Bun test uses synchronous helpers or matcher integrations, you can use the sync facade from `allure-js-commons/sync`.

```ts
import * as allure from "allure-js-commons/sync";

allure.step("check result", () => {
  allure.parameter("mode", "sync");
});
```

The sync facade is strict-sync only: `allure.step()` must finish synchronously and must not return a `Promise`.

When the test run completes, the result files will be generated in the `./allure-results` directory.

## Configuration

`allure-bun/setup` accepts the common Allure reporter configuration through `globalThis.allureBunConfig` or the `ALLURE_BUN_CONFIG` environment variable. Use a custom preload when you need values that JSON can't represent, such as listener functions or link-template functions:

```ts
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

globalThis.allureBunConfig = {
  resultsDir: "allure-results",
  environmentInfo: {
    bun: Bun.version,
  },
  globalLabels: {
    layer: "api",
  },
  links: {
    issue: {
      urlTemplate: "https://issues.example/%s",
    },
  },
} satisfies ReporterConfig;

await import("allure-bun/setup");
```

## Notes

- `allure-bun/setup` uses Bun preload and is not a Jest environment.
- Keep using Bun's regular test API in test files, including hooks, `.each`, and supported non-concurrent modifiers.
- Concurrent Bun execution is not supported. `test.concurrent`, `test.concurrent.each`, and `bun test --concurrent` fail fast with a descriptive error.
- Randomized Bun execution is not supported. `bun test --randomize` fails fast because Bun doesn't expose the current test identity to `beforeEach` hooks.
- Test-plan selection is handled while Bun tests are registered. Excluded test and hook bodies are not invoked, but top-level module code and `describe(...)` registration callbacks still run.

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
