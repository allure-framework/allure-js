import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with an epic", () => {
  allure.epic("foo");
});
