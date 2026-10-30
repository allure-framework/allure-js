# allure-vitest

> Allure framework integration for [Vitest](https://vitest.dev/) framework

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation and examples

The docs for Allure Vitest are available at [https://allurereport.org/docs/vitest/](https://allurereport.org/docs/vitest/).

Also, check out the examples at [github.com/allure-examples](https://github.com/orgs/allure-examples/repositories?q=visibility%3Apublic+archived%3Afalse+topic%3Aexample+topic%3Avitest).

## Features

- writes Allure results from Vitest node and browser runs
- supports labels, links, parameters, steps, and attachments through `allure-js-commons`
- works with Allure Report 2 and Allure Report 3

## Installation

Install `allure-vitest` using a package manager of your choice. For example:

```shell
npm install -D allure-vitest
```

> If you're a **Yarn PnP** user, you must also explicitly install `allure-js-commons` (and `@vitest/runner` with Vitest older than 4.1):
>
> ```shell
> yarn add --dev allure-js-commons
> ```
>
> Keep in mind, that `allure-js-commons` and `allure-vitest` must have the same version. The same goes for `vitest` and `@vitest/runner`. Use [`yarn info`](https://yarnpkg.com/cli/info) to check the versions.

Install Allure Report separately when you want to render the generated `allure-results`:

- follow the [Allure Report 2 installation guide](https://allurereport.org/docs/install/) to use the `allure` CLI
- or install Allure Report 3 with `npm install -D allure` to use `npx allure`

## Supported versions and platforms

- Node mode: `vitest >= 1.3.0` (with a matching `@vitest/runner` for Vitest older than 4.1)
- Browser mode: `vitest >= 4.1.0` and a matching Vitest browser provider package
- Linux, macOS, and Windows wherever Vitest supports Node.js
- this repository is validated in CI on Node.js 20 and 22

## Usage

Add the reporter to your config file if you want to use Vitest to run Node.js tests only:

```diff
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: [
      "default",
      "allure-vitest/reporter",
    ],
  },
});
```

The reporter registers the Allure setup module automatically. If your project already lists `allure-vitest/setup` in
`setupFiles`, you can keep it for compatibility or remove it from the config.

If you want to use [Vitest for browser testing](https://vitest.dev/guide/browser/), add the browser provider config:

```diff
import { defineConfig } from "vitest/config";
+ import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    reporters: [
      "default",
      "allure-vitest/reporter",
    ],
  },
  browser: {
    provider: playwright(),
    enabled: true,
    headless: true,
    instances: [
      { browser: "chromium" },
    ],
  },
});
```

The reporter also registers `allure-vitest/browser/setup` and the Allure browser command automatically when browser
mode is enabled. If your project already lists them in the config, you can keep them for compatibility or remove them.

### Browser retries and artifacts

Each browser attempt is written as a separate Allure result. `Retry` is the zero-based retry number within a repeat,
and `Max retries` is the configured retry limit for that test. Every browser result includes both parameters, including
`Retry: 0` and `Max retries: 0` when retries are disabled. Both parameters are excluded from history ID calculation.
Repeats run the test again independently of success; retries run it again after failure. A retry condition or a skip can
end execution before the configured limit, so these parameters alone do not identify the final attempt.
Node-mode reporting continues to write only the final result.

Browser mode requires Vitest 4.1+ so attempts include `aroundEach` setup and teardown.
Available Vitest failure screenshots and screenshot-comparison artifacts are attached to their owning attempt, including
comparison artifacts from passed tests. Playwright traces are attached according to Vitest's trace mode, using paths
from its trace annotations, including a custom `tracesDir`. Artifacts that Vitest does not produce or retain cannot be
attached. Automatic artifact attachment requires a Vitest version that exposes the corresponding artifacts/annotations.

Browser mode does not have a stable async context primitive equivalent to Node.js `AsyncLocalStorage`, so Allure runtime
API calls in `describe.concurrent` browser tests may still be attributed incorrectly after async boundaries. Prefer
non-concurrent browser tests when using the context-free Allure runtime API.

### View the report

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

## Allure API

Enhance the report by utilizing the runtime API:

```js
import { describe, it } from "vitest";
import * as allure from "allure-js-commons";

describe("signing in with a password", () => {
  it("should sign in with a valid password", async () => {
    await allure.description("The test checks if an active user with a valid password can sign in to the app.");
    await allure.epic("Signing in");
    await allure.feature("Sign in with a password");
    await allure.story("As an active user, I want to successfully sign in using a valid password");
    await allure.tags("signin", "ui", "positive");
    await allure.issue("https://github.com/allure-framework/allure-js/issues/1", "ISSUE-1");
    await allure.owner("eroshenkoam");
    await allure.parameter("browser", "chrome");

    const user = await allure.step("Prepare the user", async () => {
      return await createAnActiveUserInDb();
    });

    await allure.step("Make a sign-in attempt", async () => {
      await allure.step("Navigate to the sign in page", async () => {
        // ...
      });

      await allure.step("Fill the sign-in form", async (stepContext) => {
        await stepContext.parameter("login", user.login);
        await stepContext.parameter("password", user.password, "masked");

        // ...
      });

      await allure.step("Submit the form", async () => {
        // ...
        // const responseData = ...

        await allure.attachment("response", JSON.stringify(responseData), { contentType: "application/json" });
      });
    });

    await allure.step("Assert the signed-in state", async () => {
      // ...
    });
  });
});
```

More details about the API are available at [https://allurereport.org/docs/vitest-reference/](https://allurereport.org/docs/vitest-reference/).

### Sync API

When your test code uses synchronous helpers or matcher integrations, you can use the sync facade from `allure-js-commons/sync`.

```js
import * as allure from "allure-js-commons/sync";

allure.step("check result", () => {
  allure.parameter("mode", "sync");
});
```

The sync facade is strict-sync only: `allure.step()` must finish synchronously and must not return a `Promise`.
