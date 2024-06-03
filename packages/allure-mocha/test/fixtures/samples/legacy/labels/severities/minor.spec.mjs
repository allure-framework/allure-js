import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a minor test", () => {
  allure.severity("minor");
});
