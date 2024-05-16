import { expect } from "chai";
import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("a failed step", async () => {
  await step("foo", async () => {
    expect("foo").eq("bar", "baz");
  });
});
