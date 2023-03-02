# allure-codeceptjs

## Installation

```bash
npm i -D allure-codeceptjs
```

```diff
const { setHeadlessWhen, setCommonPlugins } = require("@codeceptjs/configure");
const path = require("path");

setCommonPlugins();

module.exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
+    allure: {
+      enabled: true,
+      require: "allure-codeceptjs",
+    },
  },
};
```

## Metadata usage

Right now you can access allure API through codeceptjs container.

```js
Feature("login-feature");
Scenario("login-scenario1", async () => {
  const allure = codeceptjs.container.plugins("allure");

  allure.label("name", "value");
  allure.tag("tag1");
  allure.tags("tag2", "tag3");
  allure.issue("issueName", "google.com");
  allure.owner("eroshenkoam");
  allure.layer("UI");
  allure.id("228");
  allure.description("aga");
  allure.story("aga");
  allure.feature("aga");
  allure.epic("aga");
  allure.epic("severity");
  allure.addAttachment("data.txt", "some data", "text/plain");
});
```
