import { it } from "mocha";
import { step } from "allure-js-commons/new";

it("masked step parameter", async () => {
  await step("step", (ctx) => {
    ctx.parameter("foo", "bar", "masked");
  });
});
