import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a tms link", () => {
  allure.tms("baz", "https://foo.bar");
});
