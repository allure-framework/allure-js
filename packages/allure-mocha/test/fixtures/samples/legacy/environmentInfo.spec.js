// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a test run with env info", () => {
  allure.writeEnvironmentInfo({ foo: "bar", baz: "qux" });
});
