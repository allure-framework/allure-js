import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

["bar", "baz", { key: 10 }].forEach((v) => {
  it("a test with a parameter", () => {
    allure.parameter("foo", v);
  });
});
