import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a feature", () => {
  allure.feature("foo");
});
