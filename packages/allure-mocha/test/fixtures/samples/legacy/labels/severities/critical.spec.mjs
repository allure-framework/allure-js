import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a critical test", () => {
  allure.severity("critical");
});
