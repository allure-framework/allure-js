import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a test with a hidden parameter", () => {
  allure.parameter("foo", "bar", { mode: "hidden" });
});
