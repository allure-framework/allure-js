import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a description in HTML", () => {
  allure.descriptionHtml("foo");
});
