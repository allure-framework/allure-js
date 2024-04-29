import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new/sdk/node";

describe("step", async () => {
  const testMap = new Map<string, TestResult>();
  beforeAll(async () => {
    const {tests} = await runMochaInlineTest(
      ["steps", "logStep"],
      ["steps", "lambdaStep"],
      ["steps", "serialSteps"],
      ["steps", "nestedSteps"],
      ["steps", "renamedStep"],
    );
    for (const test of tests) {
      testMap.set(test.name!, test);
    }
  });

  describe("structure", async () => {
    it("noop", async () => {
      expect(testMap.get("log step")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo"
        })]
      });
    });

    it("lambda", async () => {
      expect(testMap.get("lambda step")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo"
        })]
      });
    });

    it("serial steps", async () => {
      expect(testMap.get("serial steps")).toMatchObject({
        steps: [
          expect.objectContaining({name: "foo"}),
          expect.objectContaining({name: "bar"}),
        ]
      });
    });

    it("nested steps", async () => {
      expect(testMap.get("nested steps")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo",
          steps: [expect.objectContaining({name: "bar"})]
        }),]
      });
    });
  });

  it("can be renamed", async () => {
    expect(testMap.get("renamed step")).toMatchObject({
      steps: [expect.objectContaining({
        name: "bar"
      })]
    });
  });

  describe("timings", async () => {
    it("for serial tests match", async () => {
      const test = testMap.get("serial steps")!;
      const [firstStep, secondStep] = test.steps;
      const timestamps = [
        test.start!,
        firstStep.start!,
        firstStep.stop!,
        secondStep.start!,
        secondStep.stop!,
        test.stop!,
      ];
      expect(timestamps).toEqual([...timestamps].sort());
    });

    it("for nested tests match", async () => {
      const test = testMap.get("nested steps")!;
      const [firstStep] = test.steps;
      const [secondStep] = firstStep.steps;
      const timestamps = [
        test.start!,
        firstStep.start!,
        secondStep.start!,
        secondStep.stop!,
        firstStep.stop!,
        test.stop!,
      ];
      expect(timestamps).toEqual([...timestamps].sort());
    });
  });
});
