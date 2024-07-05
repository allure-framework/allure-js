// cjs: const { beforeEach, describe, it } = require("mocha");
// cjs: const { displayName } = require("allure-js-commons");
// esm: import { beforeEach, describe, it } from "mocha";
// esm: import { displayName } from "allure-js-commons";

describe("foo", () => {
  beforeEach(async () => {
    await displayName("bar");
  });

  it("baz", async () => {});
});
