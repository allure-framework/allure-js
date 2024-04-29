import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new/sdk/node";

describe("runtime parameter", async () => {
  const testMap = new Map<string, TestResult[]>();
  beforeAll(async () => {
    const results = await runMochaInlineTest(
      ["parameters", "testParameter"],
      ["parameters", "maskedTestParameter"],
      ["parameters", "hiddenTestParameter"],
      ["parameters", "excludedParameter"],
      ["parameters", "stepParameter"],
      ["parameters", "maskedStepParameter"],
      ["parameters", "hiddenStepParameter"],
    );
    for (const test of results.tests) {
      if (testMap.has(test.name!)) {
        testMap.get(test.name!)!.push(test);
      } else {
        testMap.set(test.name!, [test]);
      }
    }
  });

  describe("for test", async () => {
    it("can be added", async () => {
      const tests = testMap.get("test parameter");
      expect(tests).toHaveLength(2);
      expect(tests).toContainEqual(expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "bar",
        }]
      }));
      expect(tests).toContainEqual(expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "baz",
        }]
      }));
    });

    it("can be masked", async () => {
      const tests = testMap.get("masked test parameter");
      expect(tests).toHaveLength(1);
      expect(tests![0].parameters).toEqual([{
        name: "foo",
        value: "bar",
        mode: "masked",
      }]);
    });

    it("can be hidden", async () => {
      const tests = testMap.get("hidden test parameter");
      expect(tests).toHaveLength(1);
      expect(tests![0].parameters).toEqual([{
        name: "foo",
        value: "bar",
        mode: "hidden",
      }]);
    });

    it("can be excluded", async () => {
      const tests = testMap.get("excluded parameter");
      expect(tests).toHaveLength(2);
      expect(tests).toContainEqual(expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "bar",
          excluded: true,
        }]
      }));
      expect(tests).toContainEqual(expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "baz",
          excluded: true,
        }]
      }));
      expect(tests![0].historyId).toEqual(tests![1].historyId);
    });
  });

  describe("for step", async () => {
    it("can be added", async () => {
      const step = testMap.get("step parameter")![0].steps[0];
      expect(step.parameters).toEqual([{
        name: "foo",
        value: "bar",
      }]);
    });

    it("can be masked", async () => {
      const step = testMap.get("masked step parameter")![0].steps[0];
      expect(step.parameters).toEqual([{
        name: "foo",
        value: "bar",
        mode: "masked",
      }]);
    });

    it("can be hidden", async () => {
      const step = testMap.get("hidden step parameter")![0].steps[0];
      expect(step.parameters).toEqual([{
        name: "foo",
        value: "bar",
        mode: "hidden",
      }]);
    });
  });
});
