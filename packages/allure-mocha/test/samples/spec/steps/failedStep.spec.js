// cjs: const { expect } = require("chai");
// cjs: const { it } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { expect } from "chai";
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

it("a failed step", async () => {
  await step("foo", async () => {
    expect("foo").eq("bar", "baz");
  });
});
