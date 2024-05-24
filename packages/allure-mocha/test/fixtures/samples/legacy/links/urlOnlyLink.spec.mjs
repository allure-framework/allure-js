import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a url only link", () => {
  allure.link("https://foo.bar");
});
