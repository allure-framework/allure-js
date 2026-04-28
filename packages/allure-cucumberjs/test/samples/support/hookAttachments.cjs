const { Given, After } = require("@cucumber/cucumber");
const { attachment, ContentType } = require("allure-js-commons");

After("@trace", async () => {
  await attachment("Playwright Trace", "trace-content", {
    contentType: ContentType.PLAYWRIGHT_TRACE,
  });
});

After("@regular", async () => {
  await attachment("Text attachment", "some text", {
    contentType: "text/plain",
  });
});

Given("a passed step", () => {});
