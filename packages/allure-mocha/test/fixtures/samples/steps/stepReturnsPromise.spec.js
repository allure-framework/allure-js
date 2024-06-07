// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a test with a step that returns a value promise", async () => {
  const result = await step("foo", async () => await new Promise((r) => setTimeout(() => r("bar"), 50)));
  if (result !== "bar") {
    throw new Error(`Unexpected value ${result}`);
  }
});
