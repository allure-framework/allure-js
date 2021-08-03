import { Status } from "allure-js-commons";
import { JasmineTestEnv, runTest } from "./helpers";
import { matchers } from "./matchers";

describe("Allure Result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("for passed test", function() {
    const example = (testEnv: JasmineTestEnv) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.it("passed test", () => {
          testEnv.expect(true).toBeTruthy();
        });
      });
    };

    it("should have passed status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.PASSED });
    });
  });

  describe("for test with assertion", () => {
    const example = (testEnv: JasmineTestEnv) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.it("failed test", () => {
          testEnv.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should have failed status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.FAILED });
    });
  });

  describe("for test with disabled 'it'", () => {
    const example = (testEnv: JasmineTestEnv) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.xit("disabled 'it' test", () => {
          testEnv.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should have skipped status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.SKIPPED });
    });
  });

  describe("for test with disabled 'describe'", () => {
    const example = (testEnv: JasmineTestEnv) => {
      testEnv.xdescribe("Jasmine example", () => {
        testEnv.it("disabled 'describe' test", () => {
          testEnv.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should have skipped status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.SKIPPED });
    });
  });
});
