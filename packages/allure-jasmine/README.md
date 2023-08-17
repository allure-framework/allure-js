# allure-jasmine

Allure integration Jasmine framework

For usage example see `test/Setup.ts`

## Usage with Jest (`jest@<27`)

> If you're looking for `jest-circus` integration (`jest@27.x.x`) you need to
> use [`allure-jest` package][allure-jest] instead.

Use your favorite node package manager to install required packages:

```bash
npm i -D jest-jasmine2 allure-jasmine allure-js-commons @types/jasmine
```

Create `allure-setup.ts` file:

```ts
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

Change your `jest.config.js` file:

```js
module.exports = {
  preset: "ts-jest",
+  testRunner: "jest-jasmine2",
+  setupFilesAfterEnv: ["./allure-setup.ts"],
};
```

You can find example setup and usage in this [repo](https://github.com/vovsemenv/allure-jest-example)

[allure-jest]: https://github.com/allure-framework/allure-js/tree/master/packages/allure-jest
