const { Given } = require("@cucumber/cucumber");
const { globalAttachment, globalError } = require("allure-js-commons");

Given("a passed step", async () => {
  await globalAttachment("global-log", "hello", { contentType: "text/plain" });
  await globalError({ message: "global setup failed", trace: "stack" });
});
