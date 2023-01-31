import { Label, LabelName } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have label", async ({ runInlineTest }) => {
  const result: Label[] = await runInlineTest(
    {
      "a.test.ts": `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
           allure.label(LabelName.EPIC,'Test epic label');
       });
     `,
    },
    (writer) => {
      return writer.tests.map((t) => t.labels);
    },
  );
  expect(result[0]).toContainEqual({ name: LabelName.EPIC, value: "Test epic label" });
});
