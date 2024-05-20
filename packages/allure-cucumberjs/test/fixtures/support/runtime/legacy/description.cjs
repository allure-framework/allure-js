const { setWorldConstructor, Given } = require("@cucumber/cucumber");
const { CucumberAllureWorld }  = require("allure-cucumberjs")

Given("a step", () => {});

Given("a step with runtime description", async function () {
  await this.description("This is a runtime description");
  await this.descriptionHtml("This is a runtime html description");
});
