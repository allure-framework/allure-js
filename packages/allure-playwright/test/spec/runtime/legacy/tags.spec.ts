import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets multiply tags", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, allure } from 'allure-playwright';

      test('should add multiply tags', async ({}, testInfo) => {
          await allure.tag('Allure');
          await allure.tag('Playwright');
          await allure.tag('TestInfo');
          await allure.tags(...['some', 'other', 'tags']);
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
