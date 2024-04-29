import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("brokenStep", async () => {
  await step("foo", async () => {
    throw new Error("foo");
  });
});
