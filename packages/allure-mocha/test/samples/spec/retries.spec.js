// cjs: const { it, beforeEach, afterEach, describe } = require("mocha");
// cjs: const { logStep } = require("allure-js-commons");
// esm: import { it, beforeEach, afterEach, describe } from "mocha";
// esm: import { logStep } from "allure-js-commons";

describe("retries", () => {
  beforeEach(async () => {
    await logStep("beforeEach 1");
    await logStep("beforeEach 2");
  });
  afterEach(async () => {
    await logStep("afterEach 1");
    await logStep("afterEach 2");
  });

  it("a test with retries", async function () {
    await logStep("it 1");
    await logStep("it 2");
    await logStep("it 3");
    const currentRetry = this.test?.["_currentRetry"] || 0;
    if (currentRetry < 3) {
      throw new Error(`attempt ${currentRetry} is expected to fail`);
    }
    await logStep("it is ok!");
  }).retries(3);
});
