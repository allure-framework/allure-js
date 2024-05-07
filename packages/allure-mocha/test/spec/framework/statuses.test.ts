import { TestResult, Status, Stage } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("test status", async () => {
  const testMap = new Map<string | undefined, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["plain-mocha", "testInFileScope"],
      ["plain-mocha", "failedTest"],
      ["plain-mocha", "brokenTest"],
      ["plain-mocha", "skippedTest"],
    );
    for (const test of tests) {
      testMap.set(test.name, test);
    }
  });

  it("could be passed", async () => {
    expect(testMap.get("a test in a file scope")).toMatchObject({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  it("could be failed", async () => {
    expect(testMap.get("a failed test")).toMatchObject({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "baz: expected 'foo' to equal 'bar'",
        trace: expect.stringMatching(/.+/),
      },
    });
  });

  it("could be broken", async () => {
    expect(testMap.get("a broken test")).toMatchObject({
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "foo",
        trace: expect.stringMatching(/.+/),
      },
    });
  });

  it("could be skipped", async () => {
    expect(testMap.get("a skipped test")).toMatchObject({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "Test skipped",
      },
    });
  });
});
