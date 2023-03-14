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

You can also use tags to manage labels on scenarios.

### Id

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.id:228");
```

### Label

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.label.{{labelName}}:{{labelValue}}");
```

### Story

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.label.story:storyName");
```
### Suite

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.label.suite:suiteName");
```

### Owner

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.label.owner:ownerName");
```

### Tag

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.label.tag:tagName");
```
or keep it simple:

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("tagName");
```

### Issue Link

Setup codeceptjs plugin with: 

```diff
const { setHeadlessWhen, setCommonPlugins } = require("@codeceptjs/configure");
const path = require("path");

setCommonPlugins();

module.exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      enabled: true,
      require: "allure-codeceptjs",
+      issueURlTemplate: "https://example.qameta.io/allure-framework/allure-js/issues/%s",
    },
  },
};
```

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.issue:MY-ISSUE-82");
```

### TMS Link

Setup codeceptjs plugin with: 

```diff
const { setHeadlessWhen, setCommonPlugins } = require("@codeceptjs/configure");
const path = require("path");

setCommonPlugins();

module.exports.config = {
  tests: "./**/*.test.js",
  output: path.resolve(__dirname, "./output"),
  plugins: {
    allure: {
      enabled: true,
      require: "allure-codeceptjs",
+      tmsURLTemplate: "https://example.qameta.io/allure-framework/allure-js/tests/%s",
    },
  },
};
```

```javascript
Feature("login-feature");
Scenario("login-scenario1", async () => {
  // your test
}).tag("@allure.tms:MY-TEST-CASE-64");
```
