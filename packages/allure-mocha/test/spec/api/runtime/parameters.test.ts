import { runMochaInlineTest } from "../../../utils";
import { beforeAll, describe, expect, it } from "vitest";
import { TestResult } from "allure-js-commons/new/sdk/node";

describe("runtime parameter", async () => {
  const testMap = new Map<string, TestResult[]>();
  beforeAll(async () => {
    const results = await runMochaInlineTest(
      ["parameters", "testWithParameter"],
      ["parameters", "testWithMaskedParameter"],
      ["parameters", "testWithHiddenParameter"],
      ["parameters", "testWithExcludedParameter"],
    );
    for (const test of results.tests) {
      if (testMap.has(test.name!)) {
        testMap.get(test.name!)!.push(test);
      } else {
        testMap.set(test.name!, [test]);
      }
    }
  });

  it("can be added to test", async () => {
    const tests = testMap.get("a test with a parameter");
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
    const tests = testMap.get("a test with a masked parameter");
    expect(tests).toHaveLength(1);
    expect(tests![0].parameters).toEqual([{
      name: "foo",
      value: "bar",
      mode: "masked",
    }]);
  });

  it("can be hidden", async () => {
    const tests = testMap.get("a test with a hidden parameter");
    expect(tests).toHaveLength(1);
    expect(tests![0].parameters).toEqual([{
      name: "foo",
      value: "bar",
      mode: "hidden",
    }]);
  });

  it("can be excluded", async () => {
    const tests = testMap.get("a test with an excluded parameter");
    expect(tests).toEqual([
      expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "bar",
          excluded: true,
        }]
      }),
      expect.objectContaining({
        parameters: [{
          name: "foo",
          value: "baz",
          excluded: true,
        }]
      }),
    ]);
    expect(tests![0].historyId).toEqual(tests![1].historyId);
  });
});
