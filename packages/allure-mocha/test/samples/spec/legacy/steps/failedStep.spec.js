// cjs: const { expect } = require("chai");
// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { expect } from "chai";
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a failed step", () => {
  allure.step("foo", () => {
    expect("foo").eq("bar", "baz");
  });
});
