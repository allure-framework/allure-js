# allure-hermione

Allure integration for `hermione@^5.x.x`.

## Installation

Use your favorite node package manager to install required packages:

```shell
npm add -D allure-hermione allure-js-commons
```

## Setup

Add `allure-hermione` field to `plugins` in your `.hermione.conf.js` file:

```diff
module.exports = {
  plugins: {
+    "allure-hermione": {
+      resultsDir: "./allure-results"
+    }
  }
}
```

## Using allure commands

The plugin provides custom browser commands which allow to add additional info
inside your tests:

```javascript
import { expect } from "chai";

it("my test", async ({ browser, currentTest }) => {
  await browser.url("https://www.example.org/");
  await browser.$("#btn").click();

  const screenshot = await browser.takeScreenshot();

  await browser.attach(currentTest.id(), screenshot, "image/png");
  await browser.epic(currentTest.id(), "my_epic");
  await browser.parameter(currentTest.id(), "parameter_name", "parameter_value", {
    mode: "hidden",
    excluded: false,
  });

  expect(browser.url).not.eq("https://www.startpage.com/");
});
```

Don't forget to pass current test id as first argument to command!

## Supported commands

### Labels

Markup you tests with labels using low-level `label` method:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.label(currentTest.id(), "label_name", "label_value");
});
```

Or using aliases: `id`, `epic`, `feature`, `story`, `suite`, `parentSuite`, `subSuite`,
`owner`, `severity`, `tag`:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.epic(currentTest.id(), "my_epic");
});
```

### Links

Add any link by low-level `link` method:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.link(currentTest.id(), "http://example.org", "my_link_name", "my_link_type");
});
```

Or using aliases: `issue`, `tms`:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.issue(currentTest.id(), "my_link_name", "http://example.org");
});
```

### Parameters

Test parameters can be added by `parameter` method:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.parameter(currentTest.id(), "param_name", "param_value", {
    excluded: false,
  });
});
```

### Attachments

Attach any file as string or buffer using `attach` method:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.attach(currentTest.id(), JSON.stringify({ foo: "bar" }), "application/json");
});
```

If you want to attach a screenshot generated in tests, you can use the same method:

```js
it("adds screenshots", async ({ browser, currentTest }) => {
  const screenshot = await browser.takeScreenshot();

  await browser.attach(currentTest.id(), screenshot, "image/png");
});
```

### Steps

The reporter provides `step` method to add steps inside your tests for better structure:

```js
it("my test", async ({ browser, currentTest }) => {
  await browser.step(currentTest.id(), "first step name", async (s1) => {
    await s1.step("second step name", async (s2) => {
      await s2.step("third step name", (s3) => {
        // you can add infinite nested steps with any function inside
        s3.label("foo", "bar");
      });
    });
  });
});
```
