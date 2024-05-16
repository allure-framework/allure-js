import { it } from "mocha";
import { step } from "allure-js-commons";

it("a renamed step", async () => {
  await step("foo", async (ctx) => {
    await ctx.displayName("bar");
  });
});
