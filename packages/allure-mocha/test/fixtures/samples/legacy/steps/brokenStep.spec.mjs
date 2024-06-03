import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a broken step", () => {
  allure.step("foo", () => {
    throw new Error("foo");
  });
});
