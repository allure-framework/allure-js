// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a broken step", async () => {
  await step("foo", async () => {
    throw new Error("foo");
  });
});
