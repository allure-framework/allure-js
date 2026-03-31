const { Given } = require("@cucumber/cucumber");
const { logStep, stage, step } = require("allure-js-commons");

Given("allows to define runtime stages", async () => {
  stage("stage 1");
  await logStep("a");
  await step("b", async () => {
    await logStep("b 1");
    stage("b 2");
    await logStep("b 2 nested");
  });

  stage("stage 2");
  await logStep("c");
});
