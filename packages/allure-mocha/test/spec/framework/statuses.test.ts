import { beforeAll, describe, expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("test status", () => {
  const testMap = new Map<string | undefined, TestResult>();
  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["plain-mocha", "testInFileScope"],
      ["plain-mocha", "failedTest"],
      ["plain-mocha", "brokenTest"],
      ["plain-mocha", "skippedTest"],
    );
    for (const test of tests) {
      testMap.set(test.name as string, test);
    }
  });

  it("could be passed", () => {
    expect(testMap.get("a test in a file scope")).toMatchObject({
      status: Status.PASSED,
      stage: Stage.FINISHED,
    });
  });

  it("could be failed", () => {
    expect(testMap.get("a failed test")).toMatchObject({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "baz: expected 'foo' to equal 'bar'",
        trace: expect.stringMatching(/.+/),
      },
    });
  });

  it("could be broken", () => {
    expect(testMap.get("a broken test")).toMatchObject({
      status: Status.BROKEN,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "foo",
        trace: expect.stringMatching(/.+/),
      },
    });
  });

  it("could be skipped", () => {
    expect(testMap.get("a skipped test")).toMatchObject({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: {
        message: "Test skipped",
      },
    });
  });
});
