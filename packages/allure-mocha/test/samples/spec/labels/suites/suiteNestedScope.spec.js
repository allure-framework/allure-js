// cjs: const { describe, it } = require("mocha");
// cjs: const { suite } = require("allure-js-commons");
// esm: import { describe, it } from "mocha";
// esm: import { suite } from "allure-js-commons";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a suite", async () => {
        await suite("faa");
      });
    });
  });
});
