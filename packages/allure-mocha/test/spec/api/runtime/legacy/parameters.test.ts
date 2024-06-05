import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../../../utils.js";

describe("legacy runtime parameters API", () => {
  const testMap = new Map<string, TestResult[]>();
  beforeAll(async () => {
    const results = await runMochaInlineTest(
      ["legacy", "parameters", "testWithParameter"],
      ["legacy", "parameters", "testWithMaskedParameter"],
      ["legacy", "parameters", "testWithHiddenParameter"],
      ["legacy", "parameters", "testWithExcludedParameter"],
    );
    for (const testResult of results.tests) {
      if (testMap.has(testResult.name as string)) {
        testMap.get(testResult.name as string)!.push(testResult as TestResult);
      } else {
        testMap.set(testResult.name as string, [testResult as TestResult]);
      }
    }
  });

  it("can be added to test", () => {
    const tests = testMap.get("a test with a parameter");
    expect(tests).toHaveLength(3);
    expect(tests).toContainEqual(
      expect.objectContaining({
        parameters: [
          {
            name: "foo",
            value: "bar",
          },
        ],
      }),
    );
    expect(tests).toContainEqual(
      expect.objectContaining({
        parameters: [
          {
            name: "foo",
            value: "baz",
          },
        ],
      }),
    );
    expect(tests).toContainEqual(
      expect.objectContaining({
        parameters: [
          {
            name: "foo",
            // eslint-disable-next-line
            value: '{"key":10}',
          },
        ],
      }),
    );
  });

  it("can be masked", () => {
    const tests = testMap.get("a test with a masked parameter");
    expect(tests).toHaveLength(1);
    expect(tests![0].parameters).toEqual([
      {
        name: "foo",
        value: "bar",
        mode: "masked",
      },
    ]);
  });

  it("can be hidden", () => {
    const tests = testMap.get("a test with a hidden parameter");
    expect(tests).toHaveLength(1);
    expect(tests![0].parameters).toEqual([
      {
        name: "foo",
        value: "bar",
        mode: "hidden",
      },
    ]);
  });

  it("can be excluded", () => {
    const tests = testMap.get("a test with an excluded parameter");
    expect(tests).toEqual([
      expect.objectContaining({
        parameters: [
          {
            name: "foo",
            value: "bar",
            excluded: true,
          },
        ],
      }),
      expect.objectContaining({
        parameters: [
          {
            name: "foo",
            value: "baz",
            excluded: true,
          },
        ],
      }),
    ]);
    expect(tests![0].historyId).toEqual(tests![1].historyId);
  });
});
