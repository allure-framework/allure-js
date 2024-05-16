import { it } from "mocha";
import { subSuite } from "allure-js-commons/new";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a sub-suite", async () => {
        await subSuite("qux");
      });
    });
  });
});
