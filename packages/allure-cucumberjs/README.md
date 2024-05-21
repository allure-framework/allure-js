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
# using npm
npm install --save-dev allure-cucumberjs
# using yarn
yarn add -D allure-cucumberjs
# using pnpm
pnpm add -D allure-cucumberjs
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
