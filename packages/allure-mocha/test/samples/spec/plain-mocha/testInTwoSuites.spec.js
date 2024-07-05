// cjs: const { it } = require("mocha");
// esm: import { it } from "mocha";

describe("foo", async () => {
  describe("bar", async () => {
    it("a test in two suites", async () => {});
  });
});
