import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a lambda step", () => {
  allure.step("foo", () => {});
});
