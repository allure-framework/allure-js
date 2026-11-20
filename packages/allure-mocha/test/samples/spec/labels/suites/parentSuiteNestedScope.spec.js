// cjs: const { beforeEach, describe, it } = require("mocha");
// cjs: const { parentSuite } = require("allure-js-commons");
// esm: import { beforeEach, describe, it } from "mocha";
// esm: import { parentSuite } from "allure-js-commons";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      beforeEach(async () => {
        await parentSuite("faa");
      });
      it("a scoped test with a parent suite", () => {});
    });
  });
});
