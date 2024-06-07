// cjs: const { describe, it } = require("mocha");
// esm: import { describe, it } from "mocha";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      describe("qux", async () => {
        it("a test in four suites", async () => {});
      });
    });
  });
});
