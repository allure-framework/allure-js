// cjs: const { afterEach, describe, it } = require("mocha");
// esm: import { afterEach, describe, it } from "mocha";

describe("a suite with afterEach", async () => {
  afterEach("an after each hook", async () => {});

  it("a test affected by afterEach", async () => {});
});
