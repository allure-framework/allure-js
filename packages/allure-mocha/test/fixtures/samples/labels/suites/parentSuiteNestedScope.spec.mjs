import { it } from "mocha";
import { parentSuite } from "allure-js-commons";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a parent suite", async () => {
        await parentSuite("faa");
      });
    });
  });
});
