import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("two steps in a row", async () => {
  await step("foo", async () => {});
  await step("bar", async () => {});
});
