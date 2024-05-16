import { after, describe, it } from "mocha";

describe("a suite with after", async () => {
  after("an after all hook", async () => {});

  it("a test affected by after", async () => {});
});
