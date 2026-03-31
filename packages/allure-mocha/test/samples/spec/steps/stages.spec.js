// cjs: const { it } = require("mocha");
// cjs: const { logStep, stage, step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { logStep, stage, step } from "allure-js-commons";

it("runtime stages", async () => {
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
