const { After, Before } = require("@cucumber/cucumber");
const { globalAttachment, globalError } = require("allure-js-commons/sync");

Before(() => {
  globalAttachment("before-log", "before", { contentType: "text/plain" });
});

After(() => {
  globalError({ message: "after hook error" });
});
