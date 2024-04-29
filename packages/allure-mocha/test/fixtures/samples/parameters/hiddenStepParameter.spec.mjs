import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("hidden step parameter", async () => {
  await step("step", (ctx) => {
    ctx.parameter("foo", "bar", "hidden");
  });
});
