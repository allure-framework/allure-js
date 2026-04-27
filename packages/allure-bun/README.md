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

When the test run completes, the result files will be generated in the `./allure-results` directory.

## Notes

- `allure-bun/setup` uses Bun preload and is not a Jest environment.
- Keep using Bun's regular test API in test files, including hooks, `.each`, and supported non-concurrent modifiers.
- Concurrent Bun execution is not supported. `test.concurrent`, `test.concurrent.each`, and `bun test --concurrent` fail fast with a descriptive error.
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
