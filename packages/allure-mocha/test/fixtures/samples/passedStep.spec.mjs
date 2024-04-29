import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("passedStep", async () => {
  await step("foo", async () => {});
});
