import { matchers } from "./matchers";
import { Allure, Status } from "allure-js-commons";
import { runTest } from "./helpers";

describe("Allure result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("for test with passed step", () => {
    const example = (__: any, __allure: Allure) => {
      __.describe("Jasmine example", () => {
        __.it("have a passed allure step", () => {
          __allure.step("passed step name", () => {
            __.expect(true).toBeTruthy();
          });
        });
      });
    };

    it("contains passed step", async function() {
      const result = await runTest(example);
      expect(result).toHaveTestLike({
        status: Status.PASSED,
        steps: [
          {
            name: "passed step name",
            status: Status.PASSED
          }
        ]
      });
    });
  });

  describe("for test with failed step", () => {
    const example = (__: any, __allure: Allure) => {
      __.describe("Jasmine example", () => {
        __.it("have allure step with failed assertion", () => {
          __allure.step("failed step name", () => {
            __.expect(true).not.toBeTruthy();
          });
        });
      });
    };

    let result: any = undefined;

    beforeAll(async function() {
      result = await runTest(example);
    });

    xit("contains failed step", () => {
      expect(result).toHaveTestLike({
        status: Status.FAILED,
        steps: [
          {
            name: "failed step name",
            status: Status.FAILED
          }
        ]
      });
    });

    it("contains details message", () => {
      expect(result).toHaveTestLike({
        statusDetails: {
          message: "Expected true not to be truthy.",
          trace: /^Error: .+/
        }
      });
    });
  });

  describe("for test with nested step", () => {
    const example = (__: any, __allure: Allure) => {
      __.describe("Jasmine example", () => {
        __.it("have a nested allure step", () => {
          __allure.step("parent step name", () => {
            __allure.step("step name", () => {
              __.expect(true).toBeTruthy();
            });
          });
        });
      });
    };

    it("contains all nested step", async function() {
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
                status: Status.PASSED
              }
            ]
          }
        ]
      });
    });
  });
});
