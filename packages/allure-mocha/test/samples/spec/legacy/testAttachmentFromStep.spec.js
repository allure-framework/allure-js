// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("testAttachment from a step", () => {
  allure.step("foo", () => {
    allure.testAttachment("bar.txt", Buffer.from("baz"), "text/plain");
  });
});
