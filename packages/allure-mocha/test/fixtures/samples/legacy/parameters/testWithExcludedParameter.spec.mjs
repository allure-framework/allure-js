import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

["bar", "baz"].forEach((v) => {
  it("a test with an excluded parameter", () => {
    allure.parameter("foo", v, { excluded: true });
  });
});
