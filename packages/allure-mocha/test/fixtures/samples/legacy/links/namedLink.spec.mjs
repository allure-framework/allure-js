import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a named link", () => {
  allure.link("https://foo.bar", "baz");
});
