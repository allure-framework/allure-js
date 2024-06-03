// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a step with a parameter", () => {
  allure.step("foo", (ctx) => {
    ctx.parameter("bar", "baz");
  });
});
