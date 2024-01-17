# vitest-allure

> Allure framework integration for [Vitest](https://vitest.dev/) framework

<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

```bash
npm i -D vitest allure-vitest
```

or via yarn:

```bash
yarn add -D vitest allure-vitest
```

## Configuration

Add instance of the reporter to the [`reporters` section](https://vitest.dev/config/#reporters) of your Vitest config:

```js
import AllureReporter from "allure-vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // add setup file to be able to use Allure API via `this.allure` in your tests
    setupFiles: ["allure-vitest/setup],
    reporters: [
      // do not forget to keep the "default" if you want to see something in the console
      "default",
      new AllureReporter({
        links: [
          {
            type: "issue",
            urlTemplate: "https://example.org/issue/%s",
          },
          {
            type: "tms",
            urlTemplate: "https://example.org/task/%s",
          },
        ],
        resultsDir: "./allure-results",
      }),
    ],
  },
});
```

## Reporter options

Some reporter settings can set by following options:

| Option     | Description                                           | Default            |
| ---------- | ----------------------------------------------------- | ------------------ |
| resultsDir | Path to results folder                                | `./allure-results` |
| links      | Links templates to make runtime methods calls simpler | `undefined`        |

## API

If you use setup file shipped by the integration, use `this.allure` to get access
to Allure Runtime API:

```js
import { test } from "vitest";

test("sample test", async () => {
  await this.allure.label("foo", "bar");
});
```

Additionally, you can call Allure Runtime API methods directly passing the
context argument to the method:

```js
import { test } from "vitest";
import * as allure from "allure-vitest";

test("sample test", async (context) => {
  await allure.label(context, "foo", "bar");
});
```
