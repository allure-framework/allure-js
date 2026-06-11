import { LabelName } from "allure-js-commons";
import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";
import { getTestByName } from "../helpers.js";

describe("labels", () => {
  const labelCases = [
    {
      title: "label",
      importName: "label",
      call: 'await label("foo", "bar")',
      expected: { name: "foo", value: "bar" },
    },
    {
      title: "epic",
      importName: "epic",
      call: 'await epic("foo")',
      expected: { name: LabelName.EPIC, value: "foo" },
    },
    {
      title: "feature",
      importName: "feature",
      call: 'await feature("foo")',
      expected: { name: LabelName.FEATURE, value: "foo" },
    },
    {
      title: "story",
      importName: "story",
      call: 'await story("foo")',
      expected: { name: LabelName.STORY, value: "foo" },
    },
    {
      title: "suite",
      importName: "suite",
      call: 'await suite("foo")',
      expected: { name: LabelName.SUITE, value: "foo" },
    },
    {
      title: "parentSuite",
      importName: "parentSuite",
      call: 'await parentSuite("foo")',
      expected: { name: LabelName.PARENT_SUITE, value: "foo" },
    },
    {
      title: "subSuite",
      importName: "subSuite",
      call: 'await subSuite("foo")',
      expected: { name: LabelName.SUB_SUITE, value: "foo" },
    },
    {
      title: "owner",
      importName: "owner",
      call: 'await owner("foo")',
      expected: { name: LabelName.OWNER, value: "foo" },
    },
    {
      title: "severity",
      importName: "severity",
      call: 'await severity("foo")',
      expected: { name: LabelName.SEVERITY, value: "foo" },
    },
    {
      title: "layer",
      importName: "layer",
      call: 'await layer("foo")',
      expected: { name: LabelName.LAYER, value: "foo" },
    },
    {
      title: "allureId",
      importName: "allureId",
      call: 'await allureId("foo")',
      expected: { name: LabelName.ALLURE_ID, value: "foo" },
    },
    {
      title: "tag",
      importName: "tag",
      call: 'await tag("foo")',
      expected: { name: LabelName.TAG, value: "foo" },
    },
  ];

  for (const labelCase of labelCases) {
    it(labelCase.title, async () => {
      const { tests, exitCode } = await runBunInlineTest({
        "sample.test.ts": `
          import { test } from "bun:test";
          import { ${labelCase.importName} } from "allure-js-commons";

          test("${labelCase.title}", async () => {
            ${labelCase.call};
          });
        `,
      });

      expect(exitCode).toBe(0);
      expect(tests).toHaveLength(1);
      expect(tests[0].labels).toContainEqual(labelCase.expected);
    });
  }

  it("labels", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { labels } from "allure-js-commons";

        test("labels", async () => {
          await labels({ name: "foo", value: "bar" }, { name: "baz", value: "qux" });
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toEqual(
      expect.arrayContaining([
        { name: "foo", value: "bar" },
        { name: "baz", value: "qux" },
      ]),
    );
  });

  it("tags", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { tags } from "allure-js-commons";

        test("tags", async () => {
          await tags("foo", "bar");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toEqual(
      expect.arrayContaining([
        { name: LabelName.TAG, value: "foo" },
        { name: LabelName.TAG, value: "bar" },
      ]),
    );
  });

  it("adds labels from before fixtures to linked tests", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { beforeAll, test } from "bun:test";
        import { label } from "allure-js-commons";

        beforeAll(async () => {
          await label("fromBeforeAll", "yes");
        });

        test("with fixture label", () => {});
      `,
    });

    expect(exitCode).toBe(0);
    expect(getTestByName(tests, "with fixture label").labels).toContainEqual({
      name: "fromBeforeAll",
      value: "yes",
    });
  });

  it("adds configured global labels to every test", async () => {
    const { tests, exitCode } = await runBunInlineTest(
      {
        "sample.test.ts": `
          import { test } from "bun:test";

          test("configured label", () => {});
        `,
      },
      {
        env: () => ({
          ALLURE_BUN_CONFIG: JSON.stringify({
            globalLabels: { layer: "api", tag: ["configured", "bun"] },
          }),
        }),
      },
    );

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toEqual(
      expect.arrayContaining([
        { name: LabelName.LAYER, value: "api" },
        { name: LabelName.TAG, value: "configured" },
        { name: LabelName.TAG, value: "bun" },
      ]),
    );
  });

  it("user suite labels override generated suite labels", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { describe, test } from "bun:test";
        import { parentSuite, suite, subSuite } from "allure-js-commons";

        describe("generated suite", () => {
          test("suite labels", async () => {
            await parentSuite("custom parent");
            await suite("custom suite");
            await subSuite("custom sub");
          });
        });
      `,
    });

    expect(exitCode).toBe(0);
    const test = getTestByName(tests, "suite labels");

    expect(test.labels.filter(({ name }) => name === LabelName.PARENT_SUITE)).toEqual([
      { name: LabelName.PARENT_SUITE, value: "custom parent" },
    ]);
    expect(test.labels.filter(({ name }) => name === LabelName.SUITE)).toEqual([
      { name: LabelName.SUITE, value: "custom suite" },
    ]);
    expect(test.labels.filter(({ name }) => name === LabelName.SUB_SUITE)).toEqual([
      { name: LabelName.SUB_SUITE, value: "custom sub" },
    ]);
  });
});
