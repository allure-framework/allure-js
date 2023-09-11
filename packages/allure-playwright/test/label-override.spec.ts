import { LabelName, TestResult } from "allure-js-commons";
import { expect, test } from "./fixtures";
import { allure } from "../dist";

async function checkContainsOnlyOneLabel(
  testResult: TestResult,
  labelName: LabelName,
  expectedValue: string,
) {
  await allure.step("check labels", async () => {
    const labels = testResult.labels.filter((l) => l.name === labelName);
    await allure.attachment("labels", JSON.stringify(labels, null, 2), "application/json");
    expect(labels).toEqual([{ name: labelName, value: expectedValue }]);
  });
}

test("should override suite label", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should override SUITE label', async ({}) => {
           allure.label(LabelName.SUITE,'SUITE Override');
       });
     `,
  });

  const testResult = results.tests[0];
  await checkContainsOnlyOneLabel(testResult, LabelName.SUITE, "SUITE Override");
});

test("should override parent-suite label", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should override PARENT_SUITE label', async ({}) => {
           allure.label(LabelName.PARENT_SUITE,'PARENT_SUITE Override');
       });
     `,
  });

  const testResult = results.tests[0];
  await checkContainsOnlyOneLabel(testResult, LabelName.PARENT_SUITE, "PARENT_SUITE Override");
});

test("should override sub-suite label", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test.describe("nested", async () => {
         test('should override SUB_SUITE label', async ({}) => {
           allure.label(LabelName.SUB_SUITE,'SUB_SUITE Override');
         });
       });
     `,
  });

  const testResult = results.tests[0];
  await checkContainsOnlyOneLabel(testResult, LabelName.SUB_SUITE, "SUB_SUITE Override");
});
