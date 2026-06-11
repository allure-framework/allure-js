const { Given } = require("@cucumber/cucumber");
const { logStep, stage, step } = require("allure-js-commons");

Given("allows to define runtime stages", async () => {
  await stage("stage 1");
  await logStep("a");
  await step("b", async () => {
    await logStep("b 1");
    await stage("b 2");
    await logStep("b 2 nested");
  });

  await stage("stage 2");
  await logStep("c");
});
