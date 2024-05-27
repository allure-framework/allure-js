// cjs: const { expect } = require("chai");
// cjs: const { it } = require("mocha");
// esm: import { expect } from "chai";
// esm: import { it } from "mocha";

it("a failed test", async () => {
  expect("foo").eq("bar", "baz");
});
