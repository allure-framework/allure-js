import { FixtureResult, Status, Stage } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("fixtures", async () => {
  const testFixtures = new Map<string, [FixtureResult[], FixtureResult[]]>();
  beforeAll(async () => {
    const { tests, groups } = await runMochaInlineTest(
      "plain-mocha/fileScopeFixture",
    );
    const testMap = new Map(
      tests.map((t) => [t.uuid, t.name!])
    );

    // NOTE: containers are reported in the reversed order of their creation
    for (const container of groups.toReversed()) {
      for (const testUuid of container.children) {
        const testName = testMap.get(testUuid)!;
        const [beforeFixtures = [], afterFixtures = []] = testFixtures.get(testName) ?? [];
        testFixtures.set(
          testName,
          [beforeFixtures.concat(container.befores), afterFixtures.concat(container.afters)]
        );
      }
    }
  });

  describe("global", async () => {
    it("affect tests without suites", async () => {
      expect(testFixtures.get("a test affected by four fixtures")).toEqual([
        [
          expect.objectContaining({
            name: '"before all" hook for "a test affected by four fixtures"',
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
          expect.objectContaining({
            name: '"before each" hook for "a test affected by four fixtures"',
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ],
        [
          expect.objectContaining({
            name: '"after each" hook for "a test affected by four fixtures"',
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
          expect.objectContaining({
            name: '"after all" hook for "a test affected by four fixtures"',
            status: Status.PASSED,
            stage: Stage.FINISHED,
          }),
        ]
      ]);
    });
  });
});
