import { Allure, Status } from "allure-js-commons";
import { JasmineTestEnv, runTest } from "./helpers";
import { matchers } from "./matchers";

describe("Allure result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("for test with passed step", () => {
    const example = (testEnv: JasmineTestEnv, testAllure: Allure) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.it("have a passed allure step", () => {
          testAllure.step("passed step name", () => {
            testEnv.expect(true).toBeTruthy();
          });
        });
      });
    };

    it("should contain passed step", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({
        status: Status.PASSED,
        steps: [
          {
            name: "passed step name",
            status: Status.PASSED,
          },
        ],
      });
    });
  });

  describe("for test with failed step", () => {
    const example = (testEnv: JasmineTestEnv, testAllure: Allure) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.it("have allure step with failed assertion", () => {
          testAllure.step("failed step name", () => {
            testEnv.expect(true).not.toBeTruthy();
          });
        });
      });
    };

    let result: any;

    beforeAll(async function() {
      result = await runTest(example);
    });

    xit("should contain failed step", () => {
      expect(result).toHaveTestLike({
        status: Status.FAILED,
        steps: [
          {
            name: "failed step name",
            status: Status.FAILED,
          },
        ],
      });
    });

    it("should contain details message", () => {
      expect(result).toHaveTestLike({
        statusDetails: {
          message: "Expected true not to be truthy.",
          trace: /^Error: .+/,
        },
      });
    });
  });

  describe("for test with nested step", () => {
    const example = (testEnv: JasmineTestEnv, testAllure: Allure) => {
      testEnv.describe("Jasmine example", () => {
        testEnv.it("have a nested allure step", () => {
          testAllure.step("parent step name", () => {
            testAllure.step("step name", () => {
              testEnv.expect(true).toBeTruthy();
            });
          });
        });
      });
    };

    it("should contain all nested step", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({
        status: Status.PASSED,
        steps: [
          {
            name: "parent step name",
            status: Status.PASSED,
            steps: [
              {
                name: "step name",
                status: Status.PASSED,
              },
            ],
          },
        ],
      });
    });
  });
});
