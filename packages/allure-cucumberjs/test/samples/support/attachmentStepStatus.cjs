const assert = require("node:assert");
const { Given, After } = require("@cucumber/cucumber");
const { attachment, ContentType } = require("allure-js-commons");

After("@trace", async () => {
  await attachment("Playwright Trace", "trace-content", {
    contentType: ContentType.PLAYWRIGHT_TRACE,
  });
});

Given("a failing step", () => {
  assert.strictEqual("actual", "expected");
});
