# allure-cucumberjs

> Allure integration for `cucumber-js` compatible with `@cucumber/cucumber@^8.x.x` and Allure 2+.

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

## Installation

Install the required packages using your favorite package manager:

```shell
npm add -D allure-cucumberjs
```

Create `reporter.js` with following content:

```js
// reporter.js
const AllureCucumberReporter = require("allure-cucumberjs/reporter");

export default AllureCucumberReporter;
```

Then add following lines to the CucumberJS configuration file:

```diff
// config.js
export default {
+  format: "./path/to/reporter.js",
};
```

And then run CLI with `config` parameter:

```shell
cucumber-js --config ./config.js
```

## Reporter options

Some reporter settings can be set by following options:

| Option     | Description                                                                                     | Default            |
| ---------- |-------------------------------------------------------------------------------------------------| ------------------ |
| resultsDir | Path to results folder                                                                          | `./allure-results` |
| links      | Links templates to make runtime methods calls simpler and process Cucumber tags as Allure links | `undefined`        |
| labels     | Labels templates to process Cucumber tags as Allure labels                                      | `undefined`       |

## Using Allure API

To start using Allure Runtime API you need to add the following import into your `./feature/support/world.js` file:

```js
import "allure-cucumberjs";
```

Then, you can call Allure Runtime API methods directly in your step definitions:

```js
import { Given } from "@cucumber/cucumber";
import { label, attachment, step } from "allure-js-commons";

Given(/my step/, async () => {
  await step("step can have anonymous body function", async () => {
    await label("label_name", "label_value");
    await attachment(JSON.stringify({ foo: "bar " }), "application/json");
  });

  await step("by the way, body function can be arrow one", async () => {
    await label("label_name", "label_value");
    await attachment(JSON.stringify({ foo: "bar " }), "application/json");
  });
});
```

### Using Allure Cucumber World

If you prefer to use custom Allure World instead of global Allure API, you can use `AllureCucumberWorld` class:

```js
import { AllureCucumberWorld } from "allure-cucumberjs";
import { setWorldConstructor } from "@cucumber/cucumber";

setWorldConstructor(AllureCucumberWorld);
```

Then you'll be able to use Allure Runtime API through `this` in your step definition files:

```js
import { Given } from "@cucumber/cucumber";

Given(/my step/, async function() {
  const self = this;
  
  await self.step("step can have anonymous body function", async function() {
    await self.label("label_name", "label_value");
    await self.attachment(JSON.stringify({ foo: "bar " }), "application/json");
  });

  await self.step("by the way, body function can be arrow one", async function() {
    await self.label("label_name", "label_value");
    await self.attachment(JSON.stringify({ foo: "bar " }), "application/json");
  });
});
```

If you run your Cucumber features using single thread mode, `AllureCucumberWorld` is set automatically.

### Links usage

```js
const { Given } = require("@cucumber/cucumber");
import { link, issue, tms } from "allure-js-commons";

Given("step name", async () => {
  await link("link_type", "https://allurereport.org", "Allure Report");
  await issue("Issue Name", "https://github.com/allure-framework/allure-js/issues/352");
  await tms("Task Name", "https://github.com/allure-framework/allure-js/tasks/352");
});
```

You can also configure links formatters to make usage much more convenient. `%s`
in `urlTemplate` parameter will be replaced by given value.

```diff
// config.js
export default {
  format: "./path/to/reporter.js",
+  formatOptions: {
+    links: [
+      {
+        pattern: [/@issue=(.*)/],
+        type: "issue",
+        urlTemplate: "https://example.com/issues/%s",
+        nameTemplate: "Issue: %s",
+      },
+      {
+        pattern: [/@tms=(.*)/],
+        type: "tms",
+        urlTemplate: "https://example.com/tasks/%s",
+      },
+    ],
+  }
};
```

Then you can assign link using shorter notation:

```js
const { Given } = require("@cucumber/cucumber");
import { link, issue, tms } from "allure-js-commons";

Given("step name", async () => {
  await issue("351");
  await issue("352", "Issue Name");
  await tms("351");
  await tms("352", "Task Name");
  await link("custom", "352");
  await link("custom", "352", "Link name");
});
```

Links patterns also work with Cucumber tags which match `pattern` parameter:

```gherkin
@issue=0
Feature: links

  @issue=1 @tms=2
  Scenario: a
    Given a step
```

### Parameters usage

```ts
import { Given } from "@cucumber/cucumber";
import { step, parameter } from "allure-js-commons";

Given(/my step/, async () => {
  await step("step can have anonymous body function", async () => {
    await parameter("parameterName", "parameterValue");
  });
});
```

Also addParameter takes an third optional parameter with the hidden and excluded options:

`mode: "hidden" | "masked"` - `masked` hide parameter value to secure sensitive data, and `hidden` entirely hide parameter from report

`excluded: true` - excludes parameter from the history

```ts
import { Given } from "@cucumber/cucumber";
import { step, parameter } from "allure-js-commons";

Given(/my step/, async () => {
  await step("step can have anonymous body function", async () => {
    await parameter("parameterName", "parameterValue", { mode: "hidden", excluded: true });
  });
});
```

## Cross-browser testing

For cross-browser testing simply add a parameter using Allure API with the browser name to the `World` instance inside your scenario, i.e.:

```js
import { parameter } from "allure-js-commons";

await parameter('Browser', 'firefox')
```

For better presentation, you can also group suites by browser names, i.e.:

```js
import { parentSuite } from "allure-js-commons";

await parentSuite('Firefox')
```
