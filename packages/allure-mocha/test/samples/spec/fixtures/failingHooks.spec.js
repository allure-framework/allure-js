// cjs: const { describe, it, beforeEach, after } = require("mocha");
// esm: import { describe, it, beforeEach, after } from "mocha";

describe("beforeEach hook failure", () => {
  beforeEach("bad before each", () => {
    throw new Error("beforeEach hook boom");
  });

  it("failed by beforeEach hook", () => {});
});

describe("after hook failure", () => {
  after("bad after", () => {
    throw new Error("after hook boom");
  });

  it("passes before after hook", () => {});
});
