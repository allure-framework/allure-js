# allure-jest

Allure integration for jest framework

# How to use

## Default test runner (Jasmine)

By default jest uses jasmine as test runner, so you can configure allure-jasmine reporter for it:

Make allure-report.ts module:

```typescript
import {JasmineAllureReporter} from "allure-jasmine";
import {AllureRuntime, Status, TestResult} from "allure-js-commons";

const reporter = new JasmineAllureReporter(new AllureRuntime({
  resultsDir: "path/to/allure-results"
}));
jasmine.getEnv().addReporter(reporter);
```

And provide path in jest.config.js:

```js
module.exports = {
  // ...
  setupFilesAfterEnv: ["<rootDir>/path/to/allure-report.js"]
}
```


