import { Label } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have parameter", async ({ runInlineTest }) => {
  const param = { name: "parameterName", value: "parameterValue", hidden:true, excluded: false };
  const result: Label[] = await runInlineTest(
    {
      "par.test.ts": `
       import { test, expect } from '@playwright/test';
       import { allure } from '../../dist/index'
       test('should add epic label', async ({}) => {
           allure.addParameter("${param.name}", "${param.value}", { hidden:${param.hidden}, excluded: ${param.excluded}});
       });
     `,
    },
    (writer) => {
      return writer.tests.map((t) => t.parameters);
    },
  );
  expect(result[0]).toEqual([param]);
});
