# allure-cucumberjs

Allure integration for `cucumber-js` compatible with `@cucumber/cucumber@^8.x.x` and Allure 2+.

## Basic usage

Install the required packages using your favorite package manager:

```shell
# using npm
npm install --save-dev allure-js-commons allure-cucumberjs
# using yarn
yarn add -D allure-js-commons allure-cucumberjs
# using pnpm
pnpm add -D allure-js-commons allure-cucumberjs
```

Create the reporter file:

```js
// reporter.js
import { AllureRuntime } from "allure-js-commons";
import { CucumberJSAllureFormatter } from "allure-cucumberjs";

export default class extends CucumberJSAllureFormatter {
  constructor(options) {
    super(options, new AllureRuntime({ resultsDir: "./allure-results" }), {
      labels: [
        {
          pattern: [/@feature:(.*)/],
          name: "epic",
        },
        {
          pattern: [/@severity:(.*)/],
          name: "severity",
        },
      ],
      links: [
        {
          pattern: [/@issue=(.*)/],
          type: "issue",
          urlTemplate: "http://localhost:8080/issue/%s",
        },
        {
          pattern: [/@tms=(.*)/],
          type: "tms",
          urlTemplate: "http://localhost:8080/tms/%s",
        },
      ],
    });
  }
}
```

Then let know `cucumber-js` about the reporter via CLI parameter:

```shell
cucumber-js --format ./path/to/reporter.js
```

Or via configuration file:

```js
// config.js
module.exports = {
  default: {
    format: "./path/to/reporter.js",
  },
};
```

And then run CLI with `config` parameter:

```shell
cucumber-js --config ./config.js
```

If you want to retain default formatter add some dummy file as output:

```shell
cucumber-js --format ./path/to/reporter.js:./dummy.txt
```

## Using Allure API

You're able to call Allure API methods injected to the `World` object by the reporter.
By default, the feature is available out of the box for single thread mode.

Example:

```js
import { Given } from "@cucumber/cucumber";

Given(/my step/, async function () {
  await this.step("step can have anonymous body function", async function () {
    await this.label("label_name", "label_value");
    await this.attach(JSON.stringify({ foo: "bar " }), "application/json");
  });

  await this.step("by the way, body function can be arrow one", async (step) => {
    await step.label("label_name", "label_value");
    await step.attach(JSON.stringify({ foo: "bar " }), "application/json");
  });
});
```

If you want to keep the functoinality in `parallel` mode, set `CucumberAllureWorld` as
world constructor:

```diff
- import { Given } from "@cucumber/cucumber"
+ import { Given, setWorldConstructor } from "@cucumber/cucumber"
+ import { CucumberAllureWorld } from "allure-cucumberjs"

+ setWorldConstructor(CucumberAllureWorld)

Given(/my step/, async function () {
  await this.step("step can have anonymous body function", async function () {
    await this.label("label_name", "label_value")
    await this.attach(JSON.stringify({ foo: "bar "}), "application/json")
  })

  await this.step("by the way, body function can be arrow one", async (step) => {
    await step.label("label_name", "label_value")
    await step.attach(JSON.stringify({ foo: "bar "}), "application/json")
  })
})
```

Follow the same approach when you need to use your own `World` implementation. Just extend it from
`CucumberAllureWorld`:

```diff
- import { Given } from "@cucumber/cucumber"
+ import { Given, setWorldConstructor } from "@cucumber/cucumber"
+ import { CucumberAllureWorld } from "allure-cucumberjs"

+ class MyWorld extends CucumberAllureWorld {
+   hello() {
+     console.log('say hello!')
+   }
+ }

+ setWorldConstructor(MyWorld)

Given(/my step/, async function () {
+  this.hello()

  await this.step("step can have anonymous body function", async function () {
    await this.label("label_name", "label_value")
    await this.attach(JSON.stringify({ foo: "bar "}), "application/json")
  })

  await this.step("by the way, body function can be arrow one", async (step) => {
    await step.label("label_name", "label_value")
    await step.attach(JSON.stringify({ foo: "bar "}), "application/json")
  })
})
```

## TypeScript

To properly type your cucumber tests you need to declare `CustomWorld` type and use it.

```ts
import { Given } from "@cucumber/cucumber";
import { CucumberAllureWorld } from "allure-cucumberjs";

if (process.env.PARALLEL) {
  setWorldConstructor(CucumberAllureWorld);
}

type CustomWorld = {
  someCustomOptions: string;
} & CucumberAllureWorld;

Given("A cat fact is recieved", async function (this: CustomWorld) {
  await this.step("example name", async () => {
    await this.label("test label", "value");
  });
});
```

### Parameters usage

```ts
import { Given } from "@cucumber/cucumber";

Given(/my step/, async function () {
  await this.step("step can have anonymous body function", async function () {
    await this.parameter("parameterName", "parameterValue");
  });
});
```

Also addParameter takes an third optional parameter with the hidden and excluded options:

`mode: "hidden" | "masked"` - `masked` hide parameter value to secure sensitive data, and `hidden` entirely hide parameter from report

`excluded: true` - excludes parameter from the history

```ts
import { Given } from "@cucumber/cucumber";

Given(/my step/, async function () {
  await this.step("step can have anonymous body function", async function () {
    await this.parameter("parameterName", "parameterValue", { mode: "hidden", excluded: true });
  });
});
```
