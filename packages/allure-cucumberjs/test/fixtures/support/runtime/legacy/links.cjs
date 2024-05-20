const { Given } = require("@cucumber/cucumber");

Given("a step", () => {});

Given("a step with runtime link", async function() {
  await this.link("https://example.com", "custom", "Custom link");
});

Given("a step with runtime issue links", async function() {
  await this.issue("https://example.com/issues/1", "Custom issue 1");
  await this.issue("2", "Custom issue 2");
});

Given("a step with runtime tms links", async function() {
  await this.tms("https://example.com/tasks/1", "Custom task 1");
  await this.tms("2", "Custom task 2");
});
