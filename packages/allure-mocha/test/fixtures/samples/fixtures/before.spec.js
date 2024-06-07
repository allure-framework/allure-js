// cjs: const { before, describe, it } = require("mocha");
// esm: import { before, describe, it } from "mocha";

describe("a suite with before", async () => {
  before("a before all hook", async () => {});

  it("a test affected by before", async () => {});
});
