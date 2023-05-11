import { expect, test } from "./fixtures";

test("should have metadata from title", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test('some strange name to test @allure.id=228 @allure.label.tag=slow @allure.label.labelName=labelValue', async ({}, testInfo) => {
      });
      `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        { name: "ALLURE_ID", value: "228" },
        { name: "tag", value: "slow" },
        { name: "labelName", value: "labelValue" },
      ]),
    }),
  ]);
});
