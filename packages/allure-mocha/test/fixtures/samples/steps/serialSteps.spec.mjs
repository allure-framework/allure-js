import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("serial steps", async () => {
  await step("foo", async () => {});
  await step("bar", async () => {});
});
