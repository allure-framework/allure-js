import { Status } from "allure-js-commons";
import { matchers } from "./matchers";
import { runTest } from "./helpers";

describe("Allure Result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("for passed test", function() {
    const example = (__: any) => {
      __.describe("Jasmine example", () => {
        __.it("passed test", () => {
          __.expect(true).toBeTruthy();
        });
      });
    };

    it("should has passed status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.PASSED });
    });
  });

  describe("for test with assertion", () => {
    const example = (__: any) => {
      __.describe("Jasmine example", () => {
        __.it("failed test", () => {
          __.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should has failed status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.FAILED });
    });
  });

  describe("for test with disabled 'it'", () => {
    const example = (__: any) => {
      __.describe("Jasmine example", () => {
        __.xit("disabled 'it' test", () => {
          __.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should has skipped status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.SKIPPED });
    });
  });

  describe("for test with disabled 'describe'", () => {
    const example = (__: any) => {
      __.xdescribe("Jasmine example", () => {
        __.it("disabled 'describe' test", () => {
          __.expect(true).not.toBeTruthy();
        });
      });
    };

    it("should has skipped status", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({ status: Status.SKIPPED });
    });
  });
});
