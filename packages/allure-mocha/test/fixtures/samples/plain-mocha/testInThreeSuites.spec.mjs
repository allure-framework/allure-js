import { describe, it } from "mocha";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a test in three suites", async () => {});
    });
  });
});
