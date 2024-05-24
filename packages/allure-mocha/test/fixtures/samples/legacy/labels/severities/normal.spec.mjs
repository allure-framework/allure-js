import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a normal test", () => {
  allure.severity("normal");
});
