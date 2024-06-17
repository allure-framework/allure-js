import { expect, it } from "vitest";
import type { Label } from "allure-js-commons";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("overrides suite label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
       import { test, expect, allure } from "allure-playwright"

       test('should override SUITE label', async ({}) => {
           await allure.suite('SUITE Override');
       });
     `,
  });

  expect(tests).toHaveLength(1);

  const suiteLabels = tests[0].labels.filter((label: Label) => label.name === LabelName.SUITE);

  expect(suiteLabels).toHaveLength(1);
  expect(suiteLabels[0]).toEqual({ name: LabelName.SUITE, value: "SUITE Override" });
});

it("overrides parent-suite label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
       import { test, expect, allure } from "allure-playwright"

       test('should override PARENT SUITE label', async ({}) => {
           await allure.parentSuite('PARENT SUITE Override');
       });
     `,
  });

  expect(tests).toHaveLength(1);

  const parentSuiteLabels = tests[0].labels.filter((label: Label) => label.name === LabelName.PARENT_SUITE);

  expect(parentSuiteLabels).toHaveLength(1);
  expect(parentSuiteLabels[0]).toEqual({
    name: LabelName.PARENT_SUITE,
    value: "PARENT SUITE Override",
  });
});

it("overrides sub-suite label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
       import { test, expect, allure } from "allure-playwright"

       test('should override SUB SUITE label', async ({}) => {
           await allure.subSuite('SUB SUITE Override');
       });
     `,
  });

  expect(tests).toHaveLength(1);

  const subSuiteLabels = tests[0].labels.filter((label: Label) => label.name === LabelName.SUB_SUITE);

  expect(subSuiteLabels).toHaveLength(1);
  expect(subSuiteLabels[0]).toEqual({ name: LabelName.SUB_SUITE, value: "SUB SUITE Override" });
});
