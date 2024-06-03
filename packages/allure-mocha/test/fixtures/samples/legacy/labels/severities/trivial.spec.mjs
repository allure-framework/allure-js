import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a trivial test", () => {
  allure.severity("trivial");
});
