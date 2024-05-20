const { Given } = require("@cucumber/cucumber");
const { link, issue, tms } = require("allure-js-commons");

Given("a step", () => {});

Given("a step with runtime link", async () => {
  await link("https://example.com", "custom", "Custom link");
});

Given("a step with runtime issue links", async () => {
  await issue("https://example.com/issues/1", "Custom issue 1");
  await issue("2", "Custom issue 2");
});

Given("a step with runtime tms links", async () => {
  await tms("https://example.com/tasks/1", "Custom task 1");
  await tms("2", "Custom task 2");
});
