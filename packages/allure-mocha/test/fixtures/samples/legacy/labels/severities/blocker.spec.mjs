import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a blocker", () => {
  allure.severity("blocker");
});
