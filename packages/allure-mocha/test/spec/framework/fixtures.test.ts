import { beforeAll, describe, expect, it } from "vitest";
import type { Assertion } from "vitest";
import type { TestResult, TestResultContainer } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("fixtures", () => {
  let tests: readonly TestResult[], groups: readonly TestResultContainer[];
  let testNameToId: Map<string, string>;
  beforeAll(async () => {
    ({ tests, groups } = await runMochaInlineTest(
      ["fixtures", "before"],
      ["fixtures", "after"],
      ["fixtures", "beforeEach"],
      ["fixtures", "afterEach"],
      ["fixtures", "scoping"],
    ));
    testNameToId = new Map(tests.map((t) => [t.name!, t.uuid]));
  });

  const assertFixture = (
    assertion: Assertion<readonly TestResultContainer[]>,
    prop: "befores" | "afters",
    name: string,
    ...testNames: readonly string[]
  ) => {
    assertion.toContainEqual(
      expect.objectContaining({
        [prop]: expect.arrayContaining([expect.objectContaining({ name })]),
        children: testNames.map((n) => testNameToId.get(n)),
      }),
    );
  };

  const assertBeforeFixture = (name: string, ...testNames: readonly string[]) =>
    assertFixture(expect(groups), "befores", name, ...testNames);
  const assertAfterFixture = (name: string, ...testNames: readonly string[]) =>
    assertFixture(expect(groups), "afters", name, ...testNames);
  const assertNoBeforeFixture = (name: string, ...testNames: readonly string[]) =>
    assertFixture(expect(groups).not, "befores", name, ...testNames);
  const assertNoAfterFixture = (name: string, ...testNames: readonly string[]) =>
    assertFixture(expect(groups).not, "afters", name, ...testNames);

  it("reports each fixture in its own container", () => {
    const totalFixtures = groups.reduce((a, v) => a + v.afters.length + v.befores.length, 0);
    expect(groups).toHaveLength(totalFixtures);
  });

  it("should support before", () => {
    assertBeforeFixture('"before all" hook: a before all hook', "a test affected by before");
  });

  it("should support after", () => {
    assertAfterFixture('"after all" hook: an after all hook', "a test affected by after");
  });

  it("should support beforeEach", () => {
    assertBeforeFixture('"before each" hook: a before each hook', "a test affected by beforeEach");
  });

  it("should support afterEach", () => {
    assertAfterFixture('"after each" hook: an after each hook', "a test affected by afterEach");
  });

  describe("scoping", () => {
    it("level 1 before should affect two tests", () => {
      assertBeforeFixture(
        '"before all" hook: before at level 1',
        "a test affected by four fixtures",
        "a test affected by eight fixtures",
      );
    });

    it("level 2 before should affect one test", () => {
      assertBeforeFixture('"before all" hook: before at level 2', "a test affected by eight fixtures");
    });

    it("level 1 after should affect two tests", () => {
      assertAfterFixture(
        '"after all" hook: after at level 1',
        "a test affected by four fixtures",
        "a test affected by eight fixtures",
      );
    });

    it("level 2 after should affect one test", () => {
      assertAfterFixture('"after all" hook: after at level 2', "a test affected by eight fixtures");
    });

    it("level 1 beforeEach should affect two tests", () => {
      assertBeforeFixture('"before each" hook: beforeEach at level 1', "a test affected by eight fixtures");
      assertBeforeFixture('"before each" hook: beforeEach at level 1', "a test affected by four fixtures");
    });

    it("level 2 beforeEach should affect one test", () => {
      assertBeforeFixture('"before each" hook: beforeEach at level 2', "a test affected by eight fixtures");
      assertNoBeforeFixture('"before each" hook: beforeEach at level 2', "a test affected by four fixtures");
    });

    it("level 1 afterEach should affect two tests", () => {
      assertAfterFixture('"after each" hook: afterEach at level 1', "a test affected by eight fixtures");
      assertAfterFixture('"after each" hook: afterEach at level 1', "a test affected by four fixtures");
    });

    it("level 2 afterEach should affect one test", () => {
      assertAfterFixture('"after each" hook: afterEach at level 2', "a test affected by eight fixtures");
      assertNoAfterFixture('"after each" hook: afterEach at level 2', "a test affected by four fixtures");
    });
  });
});
