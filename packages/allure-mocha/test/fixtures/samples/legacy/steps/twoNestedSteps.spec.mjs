import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("two nested steps", () => {
  allure.step("foo", () => {
    allure.step("bar", () => {});
  });
});
