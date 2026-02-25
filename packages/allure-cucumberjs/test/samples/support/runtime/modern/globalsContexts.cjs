const { Before, After } = require("@cucumber/cucumber");
const { globalAttachment, globalError } = require("allure-js-commons");

void globalError({ message: "module scope error" });

Before(async () => {
  await globalAttachment("before-log", "before", { contentType: "text/plain" });
});

After(async () => {
  await globalError({ message: "after hook error" });
});
