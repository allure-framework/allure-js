import { beforeAll, describe, expect, it } from "vitest";
import { Stage, Status, TestResult } from "allure-js-commons/sdk/node";
import { runMochaInlineTest } from "../../../../utils";

describe("step", () => {
  const testMap = new Map<string, TestResult>();
  let attachments: Record<string, string | Buffer>;
  beforeAll(async () => {
    const results = await runMochaInlineTest(
      ["legacy", "steps", "logStep"],
      ["legacy", "steps", "failedLogStep"],
      ["legacy", "steps", "brokenLogStep"],
      ["legacy", "steps", "skippedLogStep"],
      ["legacy", "steps", "lambdaStep"],
      ["legacy", "steps", "twoStepsInRow"],
      ["legacy", "steps", "twoNestedSteps"],
      ["legacy", "steps", "renamedStep"],
      ["legacy", "steps", "failedStep"],
      ["legacy", "steps", "brokenStep"],
      ["legacy", "steps", "stepWithAttachment"],
      ["legacy", "steps", "stepWithParameter"],
      ["legacy", "steps", "stepReturnsValue"],
      ["legacy", "steps", "stepReturnsPromise"],
    );
    for (const testResult of results.tests) {
      testMap.set(testResult.name as string, testResult);
    }
    attachments = results.attachments;
  });

  describe("structure", () => {
    describe("log steps", () => {
      it("could be passed", () => {
        expect(testMap.get("a passed log step")).toMatchObject({
          steps: [
            expect.objectContaining({
              name: "foo",
              status: Status.PASSED,
            }),
          ],
        });
      });

      it("could be failed", () => {
        expect(testMap.get("a failed log step")).toMatchObject({
          steps: [
            expect.objectContaining({
              name: "foo",
              status: Status.FAILED,
            }),
          ],
        });
      });

      it("could be broken", () => {
        expect(testMap.get("a broken log step")).toMatchObject({
          steps: [
            expect.objectContaining({
              name: "foo",
              status: Status.BROKEN,
            }),
          ],
        });
      });

      it("could be skipped", () => {
        expect(testMap.get("a skipped log step")).toMatchObject({
          steps: [
            expect.objectContaining({
              name: "foo",
              status: Status.SKIPPED,
            }),
          ],
        });
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

  describe("step that return values", () => {
    it("may return a plain value", () => {
      expect(testMap.get("a test with a step that returns a value")).toMatchObject({
        status: Status.PASSED,
      });
    });

    it("may return a promised", () => {
      expect(testMap.get("a test with a step that returns a value promise")).toMatchObject({
        status: Status.PASSED,
      });
    });
  });

  it("can be renamed", () => {
    expect(testMap.get("a test with a renamed step")).toMatchObject({
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

  it("may contain a parameter", () => {
    expect(testMap.get("a step with a parameter")).toMatchObject({
      steps: expect.arrayContaining([
        expect.objectContaining({
          parameters: [{ name: "bar", value: "baz" }],
        }),
      ]),
    });
  });
});
