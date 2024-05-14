import { FixtureResult, TestResult, TestResultContainer } from "allure-js-commons/new/sdk/node";
import { runMochaInlineTest } from "../../utils";
import { describe, beforeAll, expect, it } from "vitest";

describe("fixtures", async () => {
  const testFixtures = new Map<string, [FixtureResult[], FixtureResult[]]>();
  let tests: readonly TestResult[], groups: readonly TestResultContainer[];
  beforeAll(async () => {
    ({ tests, groups } = await runMochaInlineTest(
      ["fixtures", "before"],
      ["fixtures", "after"],
      ["fixtures", "beforeEach"],
      ["fixtures", "afterEach"],
      ["fixtures", "renamed"],
    ));
    const testMap = new Map(
      tests.map((t) => [t.uuid, t.name!])
    );

    for (const container of groups) {
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

  it("reports each fixture in its own container", async () => {
    const totalFixtures = groups.reduce((a, v) => a + v.afters.length + v.befores.length, 0);
    expect(groups).toHaveLength(totalFixtures);
  });

  describe("in suites", async () => {
    const testFixtureNames = new Map<string, {befores: string[]; afters: string[];}>();
    beforeAll(async () => {
      for (const [testName, [befores, afters]] of testFixtures) {
        testFixtureNames.set(testName, {
          befores: befores.map((f) => f.name ?? ""),
          afters: afters.map((f) => f.name ?? ""),
        });
      }
    });

    it("has a fixture from before that affects a test", async () => {
      expect(testFixtureNames.get("a test affected by before")).toEqual({
        befores: ['"before all" hook: a before all hook'],
        afters: [],
      });
    });

    it("has a fixture from after that affects a test", async () => {
      expect(testFixtureNames.get("a test affected by after")).toEqual({
        befores: [],
        afters: ['"after all" hook: an after all hook'],
      });
    });

    it("has a fixture from beforeEach that affects a test", async () => {
      expect(testFixtureNames.get("a test affected by beforeEach")).toEqual({
        befores: ['"before each" hook: a before each hook'],
        afters: [],
      });
    });

    it("has a fixture from afterEach that affects a test", async () => {
      expect(testFixtureNames.get("a test affected by afterEach")).toEqual({
        befores: [],
        afters: ['"after each" hook: an after each hook'],
      });
    });
  });

  it("can be renamed", async () => {
    const [[fixture], _] = testFixtures.get("a test affected by a renamed fixture") ?? [[]];

    expect(fixture).toHaveProperty("name", "a new name");
  });
});
