import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with an issue link", () => {
  allure.issue("baz", "https://foo.bar");
});
