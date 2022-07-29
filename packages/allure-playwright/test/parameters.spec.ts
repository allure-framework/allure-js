import { Label } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have parameter", async ({ runInlineTest }) => {
  const param = { name: "parameterName", value: "parameterValue" };
  const result: Label[] = await runInlineTest(
    {
      "par.test.ts": `
       import { test, expect } from '@playwright/test';
       import { allure } from '../../dist/index'
       test('should add epic label', async ({}) => {
           allure.addParameter("${param.name}", "${param.value}");
       });
     `,
    },
    (writer) => {
      return writer.tests.map((t) => t.parameters);
    },
  );
  expect(result[0][0]).toEqual(param);
});
