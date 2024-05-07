import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("two nested steps", async () => {
  await step("foo", async () => {
    await step("bar", async () => {});
  });
});
