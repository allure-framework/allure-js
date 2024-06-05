// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a test with a step that returns a value promise", async () => {
  const result = await allure.step("foo", async () => await new Promise((r) => setTimeout(() => r("bar"), 50)));
  if (result !== "bar") {
    throw new Error(`Unexpected value ${result}`);
  }
});
