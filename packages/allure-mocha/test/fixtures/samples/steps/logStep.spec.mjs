import { it } from "mocha";
import { step } from "allure-js-commons";

it("a log step", async () => {
  await step("foo");
});
