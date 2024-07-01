// cjs: const { it, before } = require("mocha");
// cjs: const { step } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { step } from "allure-js-commons";

describe("foo", () => {
  before(async () => {
    await step("bar", async () => {});
  });

  it("a test with a fixture with a step", () => {});
});
