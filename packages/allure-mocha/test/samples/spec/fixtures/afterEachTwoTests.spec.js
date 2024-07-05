// cjs: const { afterEach, describe, it } = require("mocha");
// esm: import { afterEach, describe, it } from "mocha";

describe("a suite with afterEach", () => {
  afterEach("an after each hook", async () => {});

  it("the first test affected by afterEach", async () => {});
  it("the second test affected by afterEach", async () => {});
});
