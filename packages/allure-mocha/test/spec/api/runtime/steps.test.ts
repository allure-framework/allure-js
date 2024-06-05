import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import { runMochaInlineTest } from "../../../utils.js";

describe("step", () => {
  const testMap = new Map<string, TestResult>();
  let attachments: Record<string, string | Buffer>;
  beforeAll(async () => {
    const results = await runMochaInlineTest(
      ["steps", "logStep"],
      ["steps", "lambdaStep"],
      ["steps", "twoStepsInRow"],
      ["steps", "twoNestedSteps"],
      ["steps", "renamedStep"],
      ["steps", "failedStep"],
      ["steps", "brokenStep"],
      ["steps", "stepWithAttachment"],
      ["steps", "stepWithParameter"],
      ["steps", "stepWithMaskedParameter"],
      ["steps", "stepWithHiddenParameter"],
    );
    for (const testResult of results.tests) {
      testMap.set(testResult.name as string, testResult as TestResult);
    }
    attachments = results.attachments;
  });

  describe("structure", () => {
    it("noop", () => {
      expect(testMap.get("a log step")).toMatchObject({
        steps: [
          expect.objectContaining({
            name: "foo",
          }),
        ],
      });
    });

    it("lambda", () => {
      expect(testMap.get("a lambda step")).toMatchObject({
        steps: [
          expect.objectContaining({
            name: "foo",
          }),
        ],
      });
    });

    it("serial steps", () => {
      expect(testMap.get("two steps in a row")).toMatchObject({
        steps: [expect.objectContaining({ name: "foo" }), expect.objectContaining({ name: "bar" })],
      });
    });

    it("nested steps", () => {
      expect(testMap.get("two nested steps")).toMatchObject({
        steps: [
          expect.objectContaining({
            name: "foo",
            steps: [expect.objectContaining({ name: "bar" })],
          }),
        ],
      });
    });
  });

  describe("timings", () => {
    it("for serial tests match", () => {
      const test = testMap.get("two steps in a row")!;
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

    it("for nested tests match", () => {
      const test = testMap.get("two nested steps")!;
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

  describe("status", () => {
    it("could be passed", () => {
      expect(testMap.get("a lambda step")).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        steps: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
      });
    });

    it("could be failed", () => {
      expect(testMap.get("a failed step")).toMatchObject({
        status: Status.FAILED,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "baz: expected 'foo' to equal 'bar'",
          trace: expect.stringMatching(/.+/),
        },
        steps: [
          expect.objectContaining({
            status: Status.FAILED,
            stage: Stage.FINISHED,
            statusDetails: {
              message: "baz: expected 'foo' to equal 'bar'",
              trace: expect.stringMatching(/.+/),
            },
          }),
        ],
      });
    });

    it("could be broken", () => {
      expect(testMap.get("a broken step")).toMatchObject({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "foo",
          trace: expect.stringMatching(/.+/),
        },
        steps: [
          expect.objectContaining({
            status: Status.BROKEN,
            stage: Stage.FINISHED,
            statusDetails: {
              message: "foo",
              trace: expect.stringMatching(/.+/),
            },
          }),
        ],
      });
    });
  });

  it("can be renamed", () => {
    expect(testMap.get("a renamed step")).toMatchObject({
      steps: [
        expect.objectContaining({
          name: "bar",
        }),
      ],
    });
  });

  it("may contain an attachment", () => {
    const stepAttachments = testMap.get("a step with an attachment")?.steps[0].attachments;

    expect(stepAttachments).toEqual([
      expect.objectContaining({
        name: "foo.txt",
        type: "text/plain",
      }),
    ]);
    const source = stepAttachments![0].source;
    const contentInBase64 = attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });

  describe("parameters", () => {
    it("may contain a parameter", () => {
      expect(testMap.get("a step with a parameter")).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({
            parameters: [{ name: "bar", value: "baz" }],
          }),
        ]),
      });
    });

    it("may contain a masked parameter", () => {
      expect(testMap.get("a step with a masked parameter")).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({
            parameters: [{ name: "bar", value: "baz", mode: "masked" }],
          }),
        ]),
      });
    });

    it("may contain a hidden parameter", () => {
      expect(testMap.get("a step with a hidden parameter")).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({
            parameters: [{ name: "bar", value: "baz", mode: "hidden" }],
          }),
        ]),
      });
    });
  });
});
