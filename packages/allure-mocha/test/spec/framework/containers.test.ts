import { TestResultContainer } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("containers", async () => {
  const testContainers = new Map<string, TestResultContainer[]>();
  beforeAll(async () => {
    const { tests, groups } = await runMochaInlineTest(
      "plain-mocha/testInFileScope",
      "plain-mocha/testInSuite",
      "plain-mocha/testInNestedSuites",
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
      "test in file",
      "test in suite",
      "test in suite 1.1",
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
      expect(testContainers.get("test in suite")).toEqual([
        expect.objectContaining({name: "Global"}),
        expect.objectContaining({name: "suite"}),
      ]);
    });
  });

  describe("nested suites", async () => {
    it("create nested suite containers", async () => {
      expect(testContainers.get("test in suite 1.1")).toEqual([
        expect.objectContaining({name: "Global"}),
        expect.objectContaining({name: "suite 1"}),
        expect.objectContaining({name: "suite 1 suite 1.1"}),
      ]);
    });
  });
});
