const { Given } = require("@cucumber/cucumber");

Given("a step", async () => {
  const error = new Error("some message");
  error.stack =
    "    at Proxy.<anonymous> (node_modules/playwright/lib/matchers/expect.js:198:37)\n" +
    "    at Context.<anonymous> (test/spec/sample.js:6:13)\n" +
    "    at process.processImmediate (node:internal/timers:476:21)\n" +
    "    at process.callbackTrampoline (node:internal/async_hooks:130:17)";
  throw error;
});
