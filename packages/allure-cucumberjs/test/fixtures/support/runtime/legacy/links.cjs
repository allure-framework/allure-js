const { Given } = require("@cucumber/cucumber");

Given("a step", () => {});

Given("a step with runtime link", async function () {
  await this.link("custom", "https://example.com", "Custom link");
});

Given("a step with runtime issue links", async function () {
  await this.issue("Custom issue 1", "https://example.com/issues/1");
  await this.issue("Custom issue 2", "2");
});

Given("a step with runtime tms links", async function () {
  await this.tms("Custom task 1", "https://example.com/tasks/1");
  await this.tms("Custom task 2", "2");
});
