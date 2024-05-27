// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

["bar", "baz"].forEach((v) => {
  it("a test with an excluded parameter", () => {
    allure.parameter("foo", v, { excluded: true });
  });
});
