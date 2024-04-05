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

Use your favorite node package manager to install the required packages:

```shell
npm add -D allure-cypress
```

Add the following lines to your `cypress.config.js` file to setup the reporter:

```diff
const { allureCypress } = require("allure-cypress/reporter");

module.exports = {
  // ...
  e2e: {
+    setupNodeEvents: (on, config) => {
+      allureCypress(on, {
+        resultsDir: "./allure-results",
+      });
+
+      return config;
+    },
  },
};
```

Don't forget to add the Allure Cypress commands to your `cypress/support/e2e.js` file to finish 
the installation:

```diff
+ import "allure-cypress/commands";
```

## Use Allure runtime Api

The plugin provides custom commands which allow to add additional info inside your tests:

```javascript
import { epic, attachment, parameter } from "allure-cypress";

it("my test", () => {
  attachment("Attachment name", "Hello world!", "text/plain");
  epic("my_epic");
  parameter("parameter_name", "parameter_value", {
    mode: "hidden",
    excluded: false,
  });
});
```

## Links usage

```js
import { link, issue, tms } from "allure-cypress";

it("basic test", () => {
  link("link_type", "https://allurereport.org", "Allure Report");
  issue("Issue Name", "https://github.com/allure-framework/allure-js/issues/352");
  tms("Task Name", "https://github.com/allure-framework/allure-js/tasks/352");
});
```

You can also configure links formatters to make usage much more convenient. `%s`
in `urlTemplate` parameter will be replaced by given value.

```diff
const { allureCypress } = require("allure-cypress/reporter");

module.exports = {
  // ...
  e2e: {
    setupNodeEvents: (on, config) => {
      const reporter = allureCypress(on, {
+        links: [
+          {
+            type: "issue",
+            urlTemplate: "https://example.org/issues/%s"
+          },
+          {
+            type: "tms",
+            urlTemplate: "https://example.org/tasks/%s"
+          },
+          {
+            type: "custom",
+            urlTemplate: "https://example.org/custom/%s"
+          },
+        ],
+      });

      on("after:spec", (spec, result) => {
        reporter.endSpec(spec, result);
      });

      return config;
    },
  },
};
```

Then you can assign link using shorter notation:

```js
import { link, issue, tms } from "allure-cypress";

it("basic test", () => {
  issue("351");
  issue("352", "Issue Name");
  tms("351");
  tms("352", "Task Name");
  link("custom", "352");
  link("custom", "352", "Link name");
});
```

## Steps usage

The integration supports Allure steps, use them in following way:

```js
import { step } from "allure-cypress";

it("my test", () => {
  step("foo", () => {
    step("bar", () => {
      step("baz", () => {
        cy.log("my cypress commands");
      });
    });
  });
});
```

## Passing metadata from test title

You also can pass allure metadata from test title.
This is useful when you need to set allureId for the tests with failing before hooks. Just add `@allure.id={idValue}` for the allureId or `@allure.label.{labelName}={labelValue}` for other types of labels.

```ts
it("test with allureId @allure.id=256", () => {});
it("tst with severity @allure.label.severity=critical", () => {});
it("test with epic @allure.label.epic=login", () => {});
it("test with strangeLabel @allure.label.strangeLabel=strangeValue", () => {});
```

> **Warning**
> Note that changing title can cause creating new testcases in history.
> To fix this please add `@allure.id={yourTestCaseId}` to the test name if you passing allure metadata from test title

## Using custom `after:spec` hook

If you want to use your own `after:spec` hook and keep the Allure reporter working, you should use `AllureCypress` class instead:

```diff
const { AllureCypress } = require("allure-cypress/reporter");

module.exports = {
  // ...
  e2e: {
    setupNodeEvents: (on, config) => {
+      const allureCypress = new AllureCypress({
+        resultsDir: "./allure-results",
+      });
+      
+      allureCypress.attachToCypress(on, config);
+ 
+      on("after:spec", (spec, result) => {
+        allureCypress.endSpec(spec, result);
+      });     
+  
+      return config;
+    },
  },
};
```
