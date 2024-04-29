import { parentSuite, suite, subSuite } from "allure-js-commons/new";
import { it } from "mocha";

describe("suite 1", async () => {
  describe("suite 1.1", async () => {
    describe("suite 1.1.1", async () => {
      describe("suite 1.1.1.1", async () => {
        it("with-parentSuite", async () => {
          await parentSuite("foo");
        });
        it("with-suite", async () => {
          await suite("foo");
        });
        it("with-subSuite", async () => {
          await subSuite("foo");
        });
      });
    });
  });
});
