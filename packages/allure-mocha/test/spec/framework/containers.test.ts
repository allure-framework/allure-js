import { TestResultContainer } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("containers", async () => {
  const testContainers = new Map<string, TestResultContainer[]>();
  beforeAll(async () => {
    const { tests, groups } = await runMochaInlineTest(
      "plain-mocha/testInFileScope",
      "plain-mocha/testInSuite",
      "plain-mocha/testInTwoSuites",
    );
    const testMap = new Map(
      tests.map((t) => [t.uuid, t.name!])
    );

    // NOTE: containers are reported in the reversed order of their creation
    for (const container of groups.toReversed()) {
      for (const testUuid of container.children) {
        const testName = testMap.get(testUuid)!;
        testContainers.set(
          testName,
          (testContainers.get(testName) ?? []).concat([container])
        );
      }
    }
  });

  describe("global", async () => {
    it.each([
      "a test in a file scope",
      "a test in a suite",
      "a test in two suites",
    ])("contains %s", async (testName) => {
      expect(testContainers.get(testName)).toContainEqual(
        expect.objectContaining({ name: "Global" })
      );
    });

    it("all tests share the same global container", async () => {
      const globalContainerObjects = Array.from(testContainers.values()).map(
        (tcs) => tcs.find(tc => tc.name === "Global")
      );
      const ref = globalContainerObjects[0];

      expect(globalContainerObjects).toHaveLength(3);
      for (const container of globalContainerObjects) {
        expect(container).toBe(ref);
      }
    });
  });

  describe("suite", async () => {
    it("creates a suite container", async () => {
      expect(testContainers.get("a test in a suite")).toEqual([
        expect.objectContaining({name: "Global"}),
        expect.objectContaining({name: "foo"}),
      ]);
    });
  });

  describe("nested suites", async () => {
    it("create nested suite containers", async () => {
      expect(testContainers.get("a test in two suites")).toEqual([
        expect.objectContaining({name: "Global"}),
        expect.objectContaining({name: "foo"}),
        expect.objectContaining({name: "foo bar"}),
      ]);
    });
  });
});
