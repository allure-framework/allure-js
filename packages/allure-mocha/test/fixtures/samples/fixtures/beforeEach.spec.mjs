import { describe, it, beforeEach } from "mocha";

describe("a suite with beforeEach", async () => {
  beforeEach("a before each hook", async () => {});

  it("a test affected by beforeEach", async () => {});
});
