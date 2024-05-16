import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("a lambda step", async () => {
  await step("foo", async () => {});
});
