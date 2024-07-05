// cjs: const { it } = require("mocha");
// cjs: const { attachment, step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { attachment, step } from "allure-js-commons";

it("a step with an attachment", async () => {
  await step("step", async () => {
    await attachment("foo.txt", Buffer.from("bar"), "text/plain");
  });
});
