# allure-jest

> Allure framework integration for Jest

[<img src="https://allurereport.org/public/img/allure-report.svg" height="85px" alt="Allure Report logo" align="right" />](https://allurereport.org "Allure Report")

- Learn more about Allure Report at https://allurereport.org
- 📚 [Documentation](https://allurereport.org/docs/) – discover official documentation for Allure Report
- ❓ [Questions and Support](https://github.com/orgs/allure-framework/discussions/categories/questions-support) – get help from the team and community
- 📢 [Official annoucements](https://github.com/orgs/allure-framework/discussions/categories/announcements) – be in touch with the latest updates
- 💬 [General Discussion ](https://github.com/orgs/allure-framework/discussions/categories/general-discussion) – engage in casual conversations, share insights and ideas with the community

---

> **Warning**
> If you are using `jest@<27.0.0` use [`allure-jasmine` package][allure-jasmine]
> or consider to use `jest-circus` as a test runner with this package.
>
> The integration doesn't work with custom runners. If you want to use the
> integration use `jest-circus` as a test runner.

## Installation

Use your favorite node package manager to install required packages:

```shell
npm add -D allure-jest allure-js-commons
```

If you're using `jest` for testing `node` add following line to your `jest.config.js` file:

```diff
/** @type {import('jest').Config} */
const config = {
+  testEnvironment: "allure-jest/node",
+  testEnvironmentOptions: {
+    resultsDir: "./allure-results"
+  }
}

module.exports = config
```

If you're using `jest` for testing browser code (`jsdom`) add next to your `jest.config.js` file:

```diff
/** @type {import('jest').Config} */
const config = {
+  testEnvironment: "allure-jest/jsdom",
+  testEnvironmentOptions: {
+    resultsDir: "./allure-results"
+  }
}

module.exports = config
```

## Use Allure runtime Api

The plugin provides custom global commands which allow to add additional info
inside your tests:

```javascript
it("my test", () => {
  allure.attachment(currentTest.id(), screenshot, "image/png");
  allure.epic(currentTest.id(), "my_epic");
  allure.parameter(currentTest.id(), "parameter_name", "parameter_value", {
    mode: "hidden",
    excluded: false,
  });
});
```

## Links usage

```js
it("basic test", () => {
  allure.link("https://allurereport.org", "Allure Report"); // link with name
  allure.issue("Issue Name", "https://github.com/allure-framework/allure-js/issues/352");
});
```

You can also configure links formatters to make usage much more convenient. `%s`
in `urlTemplate` parameter will be replaced by given value.

```diff
/** @type {import('jest').Config} */
const config = {
  testEnvironment: "allure-jest/node",
  testEnvironmentOptions: {
    resultsDir: "./allure-results",
+    links: [
+      {
+        type: "issue",
+        urlTemplate: "https://example.org/issues/%s"
+      },
+      {
+        type: "tms",
+        urlTemplate: "https://example.org/tasks/%s"
+      },
+      {
+        type: "custom",
+        urlTemplate: "https://example.org/custom/%s"
+      },
+    ]
  }
}

module.exports = config
```

Then you can assign link using shorter notation:

```js
it("basic test", () => {
  allure.issue("Issue Name", "352");
  allure.tms("Task Name", "352");
  allure.link("352", "Link name", "custom");
});
```

[allure-jasmine]: https://github.com/allure-framework/allure-js/tree/master/packages/allure-jasmine
