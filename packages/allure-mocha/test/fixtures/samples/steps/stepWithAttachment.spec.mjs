import { it } from "mocha";
import { attachment, step } from "allure-js-commons/new";

it("a step with an attachment", async () => {
  await step("step", async () => {
    await attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
});
