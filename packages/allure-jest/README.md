# allure-jest

Allure integration for `jest@^27.x.x` (`jest-circus`).

> **Warning**
> If you're looking for `jest-jasmine` integration (`< 27.x.x`) you need to
> change default runner to `Jasmine` and use [`allure-jasmine` package][allure-jasmine] instead.

## Installation

Use your favorite node package manager to install required packages:

```shell
npm add -D allure-jest allure-js-commons jest-circus
```

Then, add following lines to your `jest.config.js` file:

```diff
/** @type {import('jest').Config} */
const config = {
+  testRunner: "jest-circus/runner",
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
