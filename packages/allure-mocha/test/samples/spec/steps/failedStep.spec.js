// cjs: const { fail } = require("assert");
// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { fail } from "assert";
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a failed step", async () => {
  await step("foo", async () => {
    fail("bar");
  });
});
