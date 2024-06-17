import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils.js";

describe("legacy suites API", () => {
  const testMap = new Map<string, TestResult>();

  beforeAll(async () => {
    const { tests } = await runMochaInlineTest(
      ["legacy", "labels", "suites", "parentSuite"],
      ["legacy", "labels", "suites", "suite"],
      ["legacy", "labels", "suites", "subSuite"],
    );
    for (const testResult of tests) {
      testMap.set(testResult.name as string, testResult);
    }
  });

  it("adds a parent suite label", () => {
    expect(testMap.get("a test with a parent suite")).toMatchObject({
      labels: expect.arrayContaining([
        {
          name: "parentSuite",
          value: "foo",
        },
      ]),
    });
  });

  it("adds a suite label", () => {
    expect(testMap.get("a test with a suite")).toMatchObject({
      labels: expect.arrayContaining([
        {
          name: "suite",
          value: "foo",
        },
      ]),
    });
  });

  it("adds a subSuite label", () => {
    expect(testMap.get("a test with a sub-suite")).toMatchObject({
      labels: expect.arrayContaining([
        {
          name: "subSuite",
          value: "foo",
        },
      ]),
    });
  });
});
