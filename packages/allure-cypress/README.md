# allure-cypress

> Allure framework integration for Cypress

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

Use your favorite Node.js package manager to install the required packages:

```shell
npm add -D allure-cypress
```

Add the following lines to your `cypress.config.js` file:

```javascript
import { defineConfig } from "cypress";
import { allureCypress } from "allure-cypress/reporter";

export default defineConfig({
  e2e: {
    setupNodeEvents: (on, config) => {
      allureCypress(on, config);

      return config;
    },
    // ...
  },
});
```

Import `allure-cypress` in `cypress/support/e2e.js`:

```javascript
import "allure-cypress";
```

Allure Cypress is ready to run now. When the test run completes, the result files
will be collected in the `./allure-results` directory. If you want to use another
location, provide it via the `resultsDir` configuration option ([see below](#allure-cypress-options)).

### View the report

> You need Allure Report to generate and open the report from result files. See the [installation instructions](https://allurereport.org/docs/install/) for more details.

Generate Allure Report:

```bash
allure generate ./allure-results -o ./allure-report
```

Open Allure Report:

```bash
allure open ./allure-report
```

## The documentation

Learn more about Allure Cypress from the official documentation at
[https://allurereport.org/docs/cypress/](https://allurereport.org/docs/cypress/).


## Allure Cypress options
| Option          | Description                                                                                                          | Default            |
|-----------------|----------------------------------------------------------------------------------------------------------------------|--------------------|
| resultsDir      | The path of the results folder.                                                                                      | `./allure-results` |
| videoOnFailOnly | When video capturing is enabled, set this option to `true` to attach the video to failed specs only.                 | `undefined`        |
| links           | Allure Runtime API link templates.                                                                                   | `undefined`        |
| environmentInfo | A set of key-value pairs to display in the Environment section of the report                                         | `undefined`        |
| categories      | An array of category definitions, each describing a [category of defects](https://allurereport.org/docs/categories/) | `undefined`        |

Here is an example of the Allure Cypress configuration:

```javascript
import { defineConfig } from "cypress";
import { allureCypress } from "allure-cypress/reporter";

export default defineConfig({
  e2e: {
    setupNodeEvents: (on, config) => {
      allureCypress(on, config, {
        resultsDir: "my-allure-results",
        videoOnFailOnly: true,
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
      });

      return config;
    },
    // other Cypress config properties ...
  },
});
```

More details about Allure Cypress configuration are available at [https://allurereport.org/docs/cypress-configuration/](https://allurereport.org/docs/cypress-configuration/).


## Combining Allure with other Cypress plugins

Use [cypress-on-fix](https://github.com/bahmutov/cypress-on-fix) to enable Allure
with other Cypress plugins. See more info [here](#setupnodeevents-limitations).

In the next example, Allure Cypress is enabled together with [@badeball/cypress-cucumber-preprocessor](https://github.com/badeball/cypress-cucumber-preprocessor):

```javascript
import { defineConfig } from "cypress";
import { allureCypress } from "allure-cypress/reporter";
import createBundler from "@bahmutov/cypress-esbuild-preprocessor";
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor";
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild";
import cypressOnFix from "cypress-on-fix";

export default defineConfig({
  e2e: {
    setupNodeEvents = async (on, config) => {
      on = cypressOnFix(on);
      await addCucumberPreprocessorPlugin(on, config);

      on("file:preprocessor", createBundler({
        plugins: [createEsbuildPlugin(config)],
      }));

      allureCypress(on, config);

      return config;
    },
    // ...
  },
});
```

## Known limitations

### `setupNodeEvents` limitations

Cypress can't compose multiple Node events, which are set in `setupNodeEvents`.

Allure Cypress requires access to the following events:

  - `after:spec`
  - `after:run`

Otherwise, it may not work as expected.

If you need to define your own handlers of those events, make sure to call the
corresponding functions of the `allureCypress`s' return value:

```javascript
import { defineConfig } from "cypress";
import { allureCypress } from "allure-cypress/reporter";

export default defineConfig({
  e2e: {
    setupNodeEvents: (on, config) => {
      const allurePlugin = allureCypress(on, config);

      on("after:spec", (spec, results) => {
        allurePlugin.onAfterSpec(spec, results);

        // your code ...
      });

      on("after:run", (results) => {
        allurePlugin.onAfterRun(results);

        // your code ...
      });

      return config;
    },
    // ...
  },
});
```

If you want to combine Allure Cypress with other plugins, consider using
[cypress-on-fix](https://github.com/bahmutov/cypress-on-fix). See the example for
[the Cypress Cucumber preprocessor](#combining-allure-with-other-cypress-plugins) above.

You may read more details and workarounds in issues [cypress-io/cypress#5240](https://github.com/cypress-io/cypress/issues/5240) and [cypress-io/cypress#22428](https://github.com/cypress-io/cypress/issues/22428).
