# allure-playwright

> Allure framework integration for [Playwright Test](https://playwright.dev) framework

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

Use your favorite node package manager to install the package:

```bash
npm i -D allure-playwright
```

## Usage

Add `allure-playwright` as the reporter in the Playwright configuration file:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: "allure-playwright",
});
```

Or, if you want to use more than one reporter:

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [["line"], ["allure-playwright"]],
});
```

Or pass the same values via the command line:

```bash
npx playwright test --reporter=line,allure-playwright
```

When the test run completes, the result files will be generated in the `./allure-results`
directory. If you want to use another location, provide it via the `resultsDir`
reporter option ([see below](#allure-playwright-options)).

### View the report

> [!NOTE]
> You need Allure Report to generate and open the report from the result files. See the [installation instructions](https://allurereport.org/docs/install/) for more details.

Generate Allure Report:

```bash
allure generate ./allure-results -o ./allure-report
```

Open Allure Report:

```bash
allure open ./allure-report
```

## The documentation

Learn more about Allure Playwright from the official documentation at
[https://allurereport.org/docs/playwright/](https://allurereport.org/docs/playwright/).

## Allure Playwright options

Use following options to configure Allure Playwright:

| Option          | Description                                                                                                          | Default            |
|-----------------|----------------------------------------------------------------------------------------------------------------------|--------------------|
| resultsDir      | The path of the results folder.                                                                                      | `./allure-results` |
| detail          | Hide the `pw:api` and `hooks` steps in report.                                                                       | `true`             |
| suiteTitle      | Use test title instead of `allure.suite()`.                                                                          | `true`             |
| links           | Allure Runtime API link templates.                                                                                   | `undefined`        |
| environmentInfo | A set of key-value pairs to display in the Environment section of the report                                         | `undefined`        |
| categories      | An array of category definitions, each describing a [category of defects](https://allurereport.org/docs/categories/) | `undefined`        |

Here is an example of the reporter configuration:

```js
import { defineConfig } from '@playwright/test';
import os from "node:os";

export default defineConfig({
  reporter: [
    [
      "allure-playwright",
      {
        detail: true,
        resultsDir: "my-allure-results",
        suiteTitle: false,
        links: {
          link: {
            urlTemplate: "https://github.com/allure-framework/allure-js/blob/main/%s",
          },
          issue: {
            urlTemplate: "https://github.com/allure-framework/allure-js/issues/%s",
            nameTemplate: "ISSUE-%s",
          },
        },
        environmentInfo: {
          OS: os.platform(),
          Architecture: os.arch(),
          NodeVersion: process.version,
        },
        categories: [
          {
            name: "Missing file errors",
            messageRegex: /^ENOENT: no such file or directory/,
          },
        ],
      },
    ],
  ],
});
```

More details about Allure Playwright configuration are available at [https://allurereport.org/docs/playwright-configuration/](https://allurereport.org/docs/playwright-configuration/).
