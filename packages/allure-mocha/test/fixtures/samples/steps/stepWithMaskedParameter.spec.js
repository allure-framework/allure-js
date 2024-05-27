// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a step with a masked parameter", async () => {
  await step("foo", async (ctx) => {
    await ctx.parameter("bar", "baz", "masked");
  });
});
