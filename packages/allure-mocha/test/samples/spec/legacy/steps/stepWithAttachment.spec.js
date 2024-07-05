// cjs: const { it } = require("mocha");
// cjs: const { allure } = require("allure-mocha/runtime");
// esm: import { it } from "mocha";
// esm: import { allure } from "allure-mocha/runtime";

it("a step with an attachment", () => {
  allure.step("step", () => {
    allure.attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
});
