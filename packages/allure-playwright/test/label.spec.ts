import { Label, LabelName } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have label", async ({ runInlineTest }) => {
  const result: Label[] = await runInlineTest(
    {
      "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure, LabelName } from '../../dist/index'
       test('should add epic label', async ({}, testInfo) => {
           allure.label(LabelName.EPIC,'Test epic label');

           allure.labels(...[{name: "test", value: 'testValue'}, {name: "test2", value: 'testValue2'}]);
       });
     `,
    },
    (writer) => {
      return writer.tests.map((t) => t.labels);
    },
  );
  expect(result[0]).toContainEqual({ name: LabelName.EPIC, value: "Test epic label" });

  expect(result[0]).toContainEqual({ name: "test", value: "testValue" });
  expect(result[0]).toContainEqual({ name: "test2", value: "testValue2" });
});
