import { parentSuite } from "allure-js-commons/new";
import { it } from "mocha";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a parent suite", async () => {
        await parentSuite("faa");
      });
    });
  });
});
