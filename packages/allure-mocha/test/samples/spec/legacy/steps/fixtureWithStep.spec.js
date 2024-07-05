// cjs: const { before, describe, it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { before, describe, it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

describe("foo", () => {
  before(() => {
    allure.step("bar", () => {});
  });

  it("a test with a fixture with a step", () => {});
});
