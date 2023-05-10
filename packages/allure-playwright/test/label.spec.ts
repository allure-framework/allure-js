import { LabelName } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have label", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
           allure.label(LabelName.EPIC,'Test epic label');

           allure.labels(...[{name: "test", value: 'testValue'}, {name: "test2", value: 'testValue2'}]);
       });
     `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        { name: LabelName.EPIC, value: "Test epic label" },
        { name: "test", value: "testValue" },
        { name: "test2", value: "testValue2" },
      ]),
    }),
  ]);
});
