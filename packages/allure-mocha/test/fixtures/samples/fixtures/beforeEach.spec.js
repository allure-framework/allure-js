// cjs: const { beforeEach, describe, it } = require("mocha");
// esm: import { beforeEach, describe, it } from "mocha";

describe("a suite with beforeEach", async () => {
  beforeEach("a before each hook", async () => {});

  it("a test affected by beforeEach", async () => {});
});
