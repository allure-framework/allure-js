import { it } from "mocha";
import { suite } from "allure-js-commons/new";

describe("foo", async () => {
  describe("bar", async () => {
    describe("baz", async () => {
      it("a scoped test with a suite", async () => {
        await suite("faa");
      });
    });
  });
});
