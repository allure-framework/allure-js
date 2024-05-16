import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("a step with a parameter", async () => {
  await step("foo", async (ctx) => {
    ctx.parameter("bar", "baz");
  });
});
