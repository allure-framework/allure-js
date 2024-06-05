import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets multiply tags", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';
      import { tag, tags } from 'allure-js-commons';

      test('should add multiply tags', async ({}, testInfo) => {
          await tag('Allure');
          await tag('Playwright');
          await tag('TestInfo');
          await tags(...['some', 'other', 'tags']);
      });
      `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        { name: LabelName.TAG, value: "Allure" },
        { name: LabelName.TAG, value: "Playwright" },
        { name: LabelName.TAG, value: "TestInfo" },
        { name: LabelName.TAG, value: "some" },
        { name: LabelName.TAG, value: "other" },
        { name: LabelName.TAG, value: "other" },
      ]),
    }),
  ]);
});
