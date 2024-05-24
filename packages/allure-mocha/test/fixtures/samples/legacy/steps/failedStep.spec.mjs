import { expect } from "chai";
import { it } from "mocha";
import { allure } from "allure-mocha/runtime";

it("a failed step", () => {
  allure.step("foo", () => {
    expect("foo").eq("bar", "baz");
  });
});
