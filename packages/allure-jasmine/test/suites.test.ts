import { Allure, LabelName } from "allure-js-commons";
import { AllureWriter } from "allure-js-commons";
import { JasmineTestEnv, runTest } from "./helpers";
import { matchers } from "./matchers";

describe("Allure Result", () => {
  beforeAll(() => jasmine.addMatchers(matchers));

  describe("test with multiple nested describe blocks", function () {
    const example = (testEnv: JasmineTestEnv, testAllure: Allure) => {
      testEnv.describe("first suite", () => {
        testEnv.describe("second suite", () => {
          testEnv.describe("third suite", () => {
            testEnv.describe("fourth suite", () => {
              testEnv.it("passed test", () => {
                testEnv.expect(true).toBe(true);
              });
            });
          });
        });
      });
    };
    let result: AllureWriter;

    beforeEach(async () => {
      result = await runTest(example);
    });

    it("adds parent suite label", async function async() {
      expect(result).toHaveTestLike({
        labels: [
          {
            name: LabelName.PARENT_SUITE,
            value: "first suite",
          },
        ],
      });
    });

    it("adds suite label", async function async() {
      expect(result).toHaveTestLike({
        labels: [
          {
            name: LabelName.SUITE,
            value: "second suite",
          },
        ],
      });
    });

    it("adds sub suite label", async function async() {
      expect(result).toHaveTestLike({
        labels: [
          {
            name: LabelName.SUB_SUITE,
            value: "third suite > fourth suite",
          },
        ],
      });
    });
  });
});
