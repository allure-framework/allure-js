# allure-cypress

> Allure framework integration for Cypress

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## The documentation

The docs for Allure Cypress are available at [https://allurereport.org/docs/cypress/](https://allurereport.org/docs/cypress/).

## Installation

Install `allure-cypress` using a package manager of your choice. For example:

```shell
npm install -D allure-cypress
```

## Usage

Call `allureCypress` to initialize the plugin from the `setupNodeEvents` function in `cypress.config.js`:

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

When the test run completes, the result files will be generated in the `./allure-results` directory.

You may select another location, or further customize the plugin's behavior with [the configuration options](https://allurereport.org/docs/cypress-configuration/).

### View the report

> You need Allure Report to be installed on your machine to generate and open the report from the result files. See the [installation instructions](https://allurereport.org/docs/install/) on how to get it.

Generate Allure Report:

```bash
allure generate ./allure-results -o ./allure-report
```

Open Allure Report:

```bash
allure open ./allure-report
```

## Allure API

Enhance the report by utilizing the Allure API:

```js
import * as allure from "allure-js-commons";

describe("signing in with a password", () => {
  it("should sign in with a valid password", () => {
    allure.description("The test checks if an active user with a valid password can sign in to the app.");
    allure.epic("Signing in");
    allure.feature("Sign in with a password");
    allure.story("As an active user, I want to successfully sign in using a valid password");
    allure.tags("signin", "ui", "positive");
    allure.issue("https://github.com/allure-framework/allure-js/issues/900", "ISSUE-900");
    allure.owner("eroshenkoam");
    allure.parameter("browser", Cypress.browser.family);

    allure.step("Prepare the user", () => {
      return createAnActiveUserInDb();
    }).then((user) => {
      allure.step("Make a sign-in attempt", () => {
        allure.step("Navigate to the sign-in page", () => {
          // ...
        });

        allure.step("Fill the sign-in form", (stepContext) => {
          stepContext.parameter("login", user.login);
          stepContext.parameter("password", user.password, "masked");

          // ...
        });

        allure.step("Submit the form", () => {
          // ...

          allure.attachment("cookies", JSON.stringify(cy.getCookies()), { contentType: "application/json" });
        });
      });
      

      allure.step("Assert the signed-in state", () => {
        // ...
      });
    });
  });
});
```

More details about the API are available at [https://allurereport.org/docs/cypress-reference/](https://allurereport.org/docs/cypress-reference/).

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

## Common issues

### The test plan feature doesn't work

Make sure you pass the Cypress config as the second argument of `allureCypress`.

Correct:

```javascript
allureCypress(on, config);
```

Also correct:

```javascript
allureCypress(on, config, {
  resultsDir: "output",
});
```

Incorrect (the test plan won't work):

```javascript
allureCypress(on);
```

Also incorrect (the legacy style; the test plan won't work either):

```javascript
allureCypress(on, {
  resultsDir: "output",
});
```

### `setupNodeEvents` limitations

Cypress can't compose multiple Node events, which are set in `setupNodeEvents`.

Allure Cypress requires access to the following events:

  - `after:spec`
  - `after:run`

Otherwise, it may not work as expected.

If you need to define your own handlers of those events, make sure to call the corresponding functions of the `allureCypress`s' return value:

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
[cypress-on-fix](https://github.com/bahmutov/cypress-on-fix). See the example for [the Cypress Cucumber preprocessor](#combining-allure-with-other-cypress-plugins) above.

You may read more details and workarounds in issues [cypress-io/cypress#5240](https://github.com/cypress-io/cypress/issues/5240) and [cypress-io/cypress#22428](https://github.com/cypress-io/cypress/issues/22428).
