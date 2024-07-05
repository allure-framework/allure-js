// cjs: const { it } = require("mocha");
// cjs: const { subSuite } = require("allure-js-commons");
// esm: import { it } from "mocha";
// esm: import { subSuite } from "allure-js-commons";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a sub-suite", async () => {
        await subSuite("qux");
      });
    });
  });
});
