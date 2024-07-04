// cjs: const { describe, it } = require("mocha");
// esm: import { describe, it } from "mocha";

describe("foo", async () => {
  describe("bar", async () => {
    it("a test in two suites", async () => {});
  });
});
