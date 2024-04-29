import { it } from "mocha";
import { attachment, step } from "allure-js-commons/new";

it("test attachment", async () => {
  await attachment("foo.txt", Buffer.from("bar"), "text/plain");
});

it("step attachment", async () => {
  await step("step", async () => {
    await attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
});

