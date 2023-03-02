import { md5 } from "allure-js-commons";
import { expect, test } from "./fixtures";
test("historical data should be fine", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {
        });
      });
      `,
    },
    (writer) => {
      return writer.tests.map((t) => ({
        name: t.name,
        fullName: t.fullName,
        historyId: t.historyId,
        testCaseId: t.testCaseId,
      }));
    },
  );

  expect(result[0].name).toBe("test");
  const fullName = "a.test.ts#nested test";
  const testCaseIdSource = "a.test.ts#test";
  expect(result[0].fullName).toBe(fullName);
  expect(result[0].historyId).toBe(md5(`${fullName}project`));
  expect(result[0].testCaseId).toBe(md5(testCaseIdSource));
});
