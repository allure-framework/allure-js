import { LabelName } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { describe, expect, it } from "vitest";

import { runVitestInlineTest, vitestTestEnvironments } from "../utils.js";

const suiteNames: readonly string[] = [LabelName.PARENT_SUITE, LabelName.SUITE, LabelName.SUB_SUITE];

describe.each(vitestTestEnvironments)("suite hierarchy in %s", (_env, createConfig) => {
  it("groups identical top-level tests by relative file path", async () => {
    const spec = `import { test } from 'vitest'; test('it works', () => {});`;
    const files = ["foo.test.ts", "first/shared.test.ts", "second/shared.test.ts"];
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createConfig(allureResultsPath),
      ...Object.fromEntries(files.map((file) => [file, spec])),
    });
    expect(tests).toHaveLength(files.length);
    for (const file of files) {
      const result = tests.find((item) => item.fullName === `dummy:${file}#it works`);
      expect(result?.labels.filter((label) => suiteNames.includes(label.name))).toEqual([
        { name: LabelName.PARENT_SUITE, value: file },
      ]);
      expect(result?.titlePath).toEqual(["dummy", ...file.split("/")]);
      expect(result?.labels).toContainEqual({ name: "_fallbackTestCaseId", value: md5(`${file}#it works`) });
    }
  });

  it("keeps nested describe blocks underneath the file", async () => {
    const spec = `
      import { describe, test } from 'vitest';
      describe('outer', () => describe('inner', () => describe('leaf', () => test('same test', () => {}))));
    `;
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createConfig(allureResultsPath),
      "first.test.ts": spec,
      "second.test.ts": spec,
    });
    expect(tests).toHaveLength(2);
    for (const file of ["first.test.ts", "second.test.ts"]) {
      const result = tests.find((item) => item.fullName === `dummy:${file}#outer inner leaf same test`);
      expect(result?.labels.filter((label) => suiteNames.includes(label.name))).toEqual([
        { name: LabelName.PARENT_SUITE, value: file },
        { name: LabelName.SUITE, value: "outer" },
        { name: LabelName.SUB_SUITE, value: "inner > leaf" },
      ]);
      expect(result?.titlePath).toEqual(["dummy", file, "outer", "inner", "leaf"]);
    }
  });

  it.each(["runtime", "metadata", "environment"])("preserves an explicit hierarchy from %s", async (source) => {
    const title =
      source === "metadata"
        ? "custom @allure.label.parentSuite:custom-parent @allure.label.suite:custom-suite @allure.label.subSuite:custom-sub"
        : "custom";
    const { tests } = await runVitestInlineTest(
      {
        "vitest.config.ts": ({ allureResultsPath }) => createConfig(allureResultsPath),
        "sample.test.ts": `
        import { describe, test } from 'vitest';
        import { parentSuite, suite, subSuite } from 'allure-js-commons';
        describe('outer', () => describe('inner', () => test(${JSON.stringify(title)}, async () => {
          ${source === "runtime" ? "await parentSuite('custom-parent'); await suite('custom-suite'); await subSuite('custom-sub');" : ""}
        })));
      `,
      },
      {
        env: (): Record<string, string> =>
          source === "environment"
            ? {
                ALLURE_LABEL_parentSuite: "custom-parent",
                ALLURE_LABEL_subSuite: "custom-sub",
                ALLURE_LABEL_suite: "custom-suite",
              }
            : {},
      },
    );
    expect(tests).toHaveLength(1);
    const labels = tests[0].labels.filter((label) => suiteNames.includes(label.name));
    expect(labels).toHaveLength(3);
    expect(labels).toEqual(
      expect.arrayContaining([
        { name: LabelName.PARENT_SUITE, value: "custom-parent" },
        { name: LabelName.SUITE, value: "custom-suite" },
        { name: LabelName.SUB_SUITE, value: "custom-sub" },
      ]),
    );
  });

  it("fills missing levels around a custom suite", async () => {
    const { tests } = await runVitestInlineTest({
      "vitest.config.ts": ({ allureResultsPath }) => createConfig(allureResultsPath),
      "sample.test.ts": `
        import { describe, test } from 'vitest';
        import { suite } from 'allure-js-commons';
        describe('outer', () => describe('inner', () => test('custom suite', async () => {
          await suite('custom-suite');
        })));
      `,
    });
    expect(tests).toHaveLength(1);
    expect(tests[0].labels.filter((label) => suiteNames.includes(label.name))).toEqual([
      { name: LabelName.SUITE, value: "custom-suite" },
      { name: LabelName.PARENT_SUITE, value: "sample.test.ts" },
      { name: LabelName.SUB_SUITE, value: "inner" },
    ]);
  });
});
