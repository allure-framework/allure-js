const { Given } = require("@cucumber/cucumber");

Given("a step", () => {});

Given("a step with runtime description", async function () {
  await this.description("This is a runtime description");
  await this.descriptionHtml("This is a runtime html description");
});
