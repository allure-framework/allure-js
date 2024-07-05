// cjs: const { fail } = require("assert");
// cjs: const { it } = require("mocha");
// esm: import { fail } from "assert";
// esm: import { it } from "mocha";

it("a failed test", async () => {
  fail("foo");
});
