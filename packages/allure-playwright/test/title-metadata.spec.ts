import { Label } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have metadata from title", async ({ runInlineTest }) => {
  const result: Label[][] = await runInlineTest(
    {
      "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test('some strange name to test @allure.id=228 @allure.label.tag=slow @allure.label.labelName=labelValue', async ({}, testInfo) => {
      });
      `,
    },
    (writer) => {
      return writer.tests.map((t) => t.labels);
    },
  );

  expect(result[0].length).toBe(9);

  expect(result[0]).toEqual(
    expect.arrayContaining([
      { name: "ALLURE_ID", value: "228" },
      { name: "tag", value: "slow" },
      { name: "labelName", value: "labelValue" },
    ]),
  );
});
