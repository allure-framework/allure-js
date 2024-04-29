import { TestResult, Status, Stage } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("status", async () => {
  const testMap = new Map<string | undefined, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      "passedTest",
      "failedTest",
      "brokenTest",
      "skippedTest",
      "passedStep",
      "failedStep",
      "brokenStep",
    );
    for (const test of tests) {
      testMap.set(test.name, test);
    }
  });

  describe("of test", async () => {
    it("could be passed", async () => {
      expect(testMap.get("passedTest")).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
    });

    it("could be failed", async () => {
      expect(testMap.get("failedTest")).toMatchObject({
        status: Status.FAILED,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "baz: expected 'foo' to equal 'bar'",
          trace: expect.stringMatching(/.+/),
        },
      });
    });

    it("could be broken", async () => {
      expect(testMap.get("brokenTest")).toMatchObject({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "foo",
          trace: expect.stringMatching(/.+/),
        },
      });
    });

    it("could be skipped", async () => {
      expect(testMap.get("skippedTest")).toMatchObject({
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "Test skipped",
        },
      });
    });
  });

  describe("of step", async () => {
    it("could be passed", async () => {
      const test = testMap.get("passedStep");
      expect(test).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
      expect(test?.steps[0]).toMatchObject({
        status: Status.PASSED,
        stage: Stage.FINISHED,
      });
    });

    it("could be failed", async () => {
      const test = testMap.get("failedStep");
      expect(test).toMatchObject({
        status: Status.FAILED,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "baz: expected 'foo' to equal 'bar'",
          trace: expect.stringMatching(/.+/),
        },
      });
      expect(test?.steps[0]).toMatchObject({
        status: Status.FAILED,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "baz: expected 'foo' to equal 'bar'",
          trace: expect.stringMatching(/.+/),
        },
      });
    });

    it("could be broken", async () => {
      const test = testMap.get("brokenStep");
      expect(test).toMatchObject({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "foo",
          trace: expect.stringMatching(/.+/),
        },
      });
      expect(test?.steps[0]).toMatchObject({
        status: Status.BROKEN,
        stage: Stage.FINISHED,
        statusDetails: {
          message: "foo",
          trace: expect.stringMatching(/.+/),
        },
      });
    });
  });
});
