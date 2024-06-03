import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("two steps in a row", () => {
  allure.step("foo", () => {});
  allure.step("bar", () => {});
});
