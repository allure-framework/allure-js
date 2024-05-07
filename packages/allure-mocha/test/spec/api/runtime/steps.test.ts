import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult, Stage, Status } from "allure-js-commons/new/sdk/node";

describe("step", async () => {
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
    for (const test of results.tests) {
      testMap.set(test.name!, test);
    }
    attachments = results.attachments;
  });

  describe("structure", async () => {
    it("noop", async () => {
      expect(testMap.get("a log step")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo"
        })]
      });
    });

    it("lambda", async () => {
      expect(testMap.get("a lambda step")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo"
        })]
      });
    });

    it("serial steps", async () => {
      expect(testMap.get("two steps in a row")).toMatchObject({
        steps: [
          expect.objectContaining({name: "foo"}),
          expect.objectContaining({name: "bar"}),
        ]
      });
    });

    it("nested steps", async () => {
      expect(testMap.get("two nested steps")).toMatchObject({
        steps: [expect.objectContaining({
          name: "foo",
          steps: [expect.objectContaining({name: "bar"})]
        }),]
      });
    });
  });

  describe("timings", async () => {
    it("for serial tests match", async () => {
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

    it("for nested tests match", async () => {
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

  describe("status", async () => {
    it("could be passed", async () => {
      expect(testMap.get("a lambda step")).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        steps: [
          expect.objectContaining({
            status: Status.PASSED,
            stage: Stage.FINISHED,
          })
        ]
      });
    });

    it("could be failed", async () => {
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
          })
        ]
      });
    });

    it("could be broken", async () => {
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
          })
        ]
      });
    });
  });

  it("can be renamed", async () => {
    expect(testMap.get("a renamed step")).toMatchObject({
      steps: [expect.objectContaining({
        name: "bar"
      })]
    });
  });

  it("may contain an attachment", async () => {
    const stepAttachments = testMap.get("a step with an attachment")?.steps[0].attachments;

    expect(stepAttachments).toEqual([
      expect.objectContaining({
        name: "foo.txt",
        type: "text/plain"
      })
    ]);
    const source = stepAttachments![0].source;
    const contentInBase64 = attachments[source] as string;
    const decodedContent = Buffer.from(contentInBase64, "base64").toString("utf8");
    expect(decodedContent).toEqual("bar");
  });

  describe("parameters", async () => {
    it("may contain a parameter", async () => {
      expect(testMap.get("a step with a parameter")).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({
            parameters: [{ name: "bar", value: "baz" }],
          }),
        ]),
      });
    });

    it("may contain a masked parameter", async () => {
      expect(testMap.get("a step with a masked parameter")).toMatchObject({
        steps: expect.arrayContaining([
          expect.objectContaining({
            parameters: [{ name: "bar", value: "baz", mode: "masked" }],
          }),
        ]),
      });
    });

    it("may contain a hidden parameter", async () => {
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
