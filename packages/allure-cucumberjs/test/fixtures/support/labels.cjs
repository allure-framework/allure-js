const { Given } = require("@cucumber/cucumber");
const { label } = require("allure-js-commons/new");

Given("a step", () => {});

Given("a step with label", async () => {
  await label("label", "value");
});
