# vitest-allure

Allure integration for Vitest. Based on code from this thread: https://github.com/allure-framework/allure-js/issues/415

## Configuration

Add this reporter to the [`reporters` section](https://vitest.dev/config/#reporters) of Vitest config

```js
export default defineConfig({
  test: {
    // do not forget to keep the "default" if you want to see something in the console
    reporters: ["default", "TODO-VITEST-ALLURE-PACKAGE"],
    // optional, if you want to write results to a different directory
    outputFile: {
      allure: "allure-results",
    },
  },
});
```

## API

To use advanced test instrumentation features, use `allureTest` API. Powered by Vitest's [test context feature](https://vitest.dev/guide/test-context.html#extend-test-context):

```js
import { allureTest } from "TODO-VITEST-ALLURE-PACKAGE/test";

allureTest("labels", ({ allure }) => {
  allure.label("demo", "works");
});
```

Currently, only labels, steps and attachments are supported.

See the `test/features.test.ts` for more examples.
