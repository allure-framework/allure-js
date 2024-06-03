import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a log step", () => {
  allure.step("foo");
});
