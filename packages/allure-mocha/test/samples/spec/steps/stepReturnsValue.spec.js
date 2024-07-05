// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a test with a step that returns a value", async () => {
  const result = await step("foo", () => "bar");
  if (result !== "bar") {
    throw new Error(`Unexpected value ${result}`);
  }
});
