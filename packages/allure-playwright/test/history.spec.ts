import { md5 } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("historical data should be fine", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {
        });
      });
      `,
  });
  const fullName = "a.test.ts#nested test";

  expect(results.tests).toEqual([
    expect.objectContaining({
      name: "test",
      fullName: fullName,
      testCaseId: md5(fullName),
      historyId: md5(fullName) + ":" + md5("Project:project"),
    }),
  ]);
});
