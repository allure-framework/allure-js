import { Parameter } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should have parameter", async ({ runInlineTest }) => {
  const result: Parameter[][] = await runInlineTest(
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
    (writer) => {
      return writer.tests.map((t) => t.parameters);
    },
    {
      "--repeat-each": "2",
    },
  );
  expect(result).toContainEqual([
    { name: "Project", value: "project" },
    { name: "Repetition", value: "1" },
    { name: "param1", value: "paramValue1" },
    { excluded: true, name: "param2", value: "paramValue2" },
    { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
    { mode: "hidden", name: "param4", value: "paramValue4" },
  ]);

  expect(result).toContainEqual([
    { name: "Project", value: "project" },
    { name: "Repetition", value: "2" },
    { name: "param1", value: "paramValue1" },
    { excluded: true, name: "param2", value: "paramValue2" },
    { excluded: true, mode: "masked", name: "param3", value: "paramValue3" },
    { mode: "hidden", name: "param4", value: "paramValue4" },
  ]);
});
