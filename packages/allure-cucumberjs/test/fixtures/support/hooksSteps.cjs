const { Given, Before, After } = require("@cucumber/cucumber");
const { step } = require("allure-js-commons");

Before(async () => {
  await step("before step 1", () => {});
  await step("before step 2", () => {});
});

After(async () => {
  await step("after step 1", () => {});
  await step("after step 2", () => {});
});

Given("a passed step", async () => {
  await step("sub step 1", () => {});
  await step("sub step 2", () => {});
});
