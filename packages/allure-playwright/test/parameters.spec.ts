import { expect, test } from "./fixtures";

test("should have parameter", async ({ runInlineTest }) => {
  const results = await runInlineTest(
    {
      "par.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       import { allure } from '../../dist/index'
       test('should add epic label', async ({}) => {
        allure.parameter("param1", "paramValue1");
        allure.parameter("param2", "paramValue2", {excluded:true});
        allure.parameter("param3", "paramValue3", {mode:"masked", excluded:true});
        allure.parameter("param4", "paramValue4", {mode:"hidden"});
       });
     `,
    },
    {
      "--repeat-each": "2",
    },
  );

  expect(results.tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        parameters: [
          { name: "Project", value: JSON.stringify("project") },
          { name: "Repetition", value: JSON.stringify("1") },
          { name: "param1", value: JSON.stringify("paramValue1") },
          { excluded: true, name: "param2", value: JSON.stringify("paramValue2") },
          { excluded: true, mode: "masked", name: "param3", value: JSON.stringify("paramValue3") },
          { mode: "hidden", name: "param4", value: JSON.stringify("paramValue4") },
        ],
      }),
      expect.objectContaining({
        parameters: [
          { name: "Project", value: JSON.stringify("project") },
          { name: "Repetition", value: JSON.stringify("2") },
          { name: "param1", value: JSON.stringify("paramValue1") },
          { excluded: true, name: "param2", value: JSON.stringify("paramValue2") },
          { excluded: true, mode: "masked", name: "param3", value: JSON.stringify("paramValue3") },
          { mode: "hidden", name: "param4", value: JSON.stringify("paramValue4") },
        ],
      }),
    ]),
  );
});
