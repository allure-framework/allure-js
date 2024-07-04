// cjs: const { fail } = require("assert");
// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { fail } from "assert";
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a failed step", () => {
  allure.step("foo", () => {
    fail("bar");
  });
});
