import { Label, LabelName } from "allure-js-commons";
import { test, expect } from "./fixtures";

test("should have label", async ({ runInlineTest }) => {
  const result: Label[] = await runInlineTest(
    {
      "a.test.ts": `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
           allure.label({name:LabelName.EPIC,value:'Test epic label'});
       });
     `,
    },
    (writer) => {
      return writer.tests.map((t) => t.labels);
    },
  );
  expect(result[0]).toContainEqual({ name: LabelName.EPIC, value: "Test epic label" });
});
