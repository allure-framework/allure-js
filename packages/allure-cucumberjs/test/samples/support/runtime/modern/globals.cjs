const { Before } = require("@cucumber/cucumber");
const { globalAttachment, globalError } = require("allure-js-commons");

let isSent = false;

Before(async () => {
  if (isSent) {
    return;
  }

  isSent = true;
  await globalAttachment("global-log", "hello", { contentType: "text/plain" });
  await globalError({ message: "global setup failed", trace: "stack" });
});
