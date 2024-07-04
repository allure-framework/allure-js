// cjs: const { describe, it } = require("mocha");
// cjs: const { parentSuite } = require("allure-js-commons");
// esm: import { describe, it } from "mocha";
// esm: import { parentSuite } from "allure-js-commons";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a parent suite", async () => {
        await parentSuite("faa");
      });
    });
  });
});
