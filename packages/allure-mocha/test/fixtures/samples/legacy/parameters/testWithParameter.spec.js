// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

["bar", "baz", { key: 10 }].forEach((v) => {
  it("a test with a parameter", () => {
    allure.parameter("foo", v);
  });
});
