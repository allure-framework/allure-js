// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("two steps in a row", () => {
  allure.step("foo", () => {});
  allure.step("bar", () => {});
});
