# Allure integration for jest framework

> **Warning**
> This integration don't work with default runner since jest 27+.
> To use this integration after jest 27 you need to change default runner to `Jasmine`.

## Examples

You can find example setup and usage in this [repo](https://github.com/vovsemenv/allure-jest-example)

## Circus test runner (default for jest@^27)

Currently we didn't have official solution for circus test runner. Consider using this [community plugin](https://github.com/ryparker/jest-circus-allure-environment) instead

## Jasmine test runner (default for jest@<27)

### Install dependencies

```bash
npm i -D jest-jasmine2@INSTALLED_JEST_VERSION allure-jasmine allure-js-commons @types/jasmine
```

Create `allure-setup.ts` file:

```typescript
import { JasmineAllureReporter } from "allure-jasmine";
import { JasmineAllureInterface } from "allure-jasmine/dist/src/JasmineAllureReporter";

const reporter = new JasmineAllureReporter({ resultsDir: "allure-results" });
jasmine.getEnv().addReporter(reporter);
// @ts-expect-error
global.allure = reporter.getInterface();

declare global {
  const allure: JasmineAllureInterface;
}
```

### Change jest.config.js

```js
module.exports = {
  testRunner: "jest-jasmine2",
  preset: "ts-jest",
  setupFilesAfterEnv: ["./allure-setup.ts"],
};
```
