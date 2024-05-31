import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with tags", () => {
  allure.tag("foo");
  allure.tag("bar");
});
