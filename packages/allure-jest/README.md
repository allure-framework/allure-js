# allure-jest

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

Then, add following line to your `jest.config.js` file:

```diff
/** @type {import('jest').Config} */
const config = {
+  testEnvironment: "allure-jest",
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

[allure-jasmine]: https://github.com/allure-framework/allure-js/tree/master/packages/allure-jasmine
