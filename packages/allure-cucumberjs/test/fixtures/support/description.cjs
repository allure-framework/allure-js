const { Given } = require("@cucumber/cucumber");
const { description, descriptionHtml } = require("allure-js-commons/new");

Given("a step", () => {});

Given("a step with runtime description", async () => {
  await description("This is a runtime description");
  await descriptionHtml("This is a runtime html description");
});
