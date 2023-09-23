/* eslint-disable quote-props */
import { expect, test } from "./fixtures";

test("should have envInfo", async ({ runInlineTest }) => {
  const allureResults = await runInlineTest({
    "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName,Status } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
       });
     `,
    reporterOptions: JSON.stringify({
      environmentInfo: {
        envVar1: "envVar1Value",
        envVar2: "envVar2Value",
      },
    }),
  });

  expect(allureResults.envInfo).toEqual({
    envVar1: "envVar1Value",
    envVar2: "envVar2Value",
  });
});
